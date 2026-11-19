import type { AirConditionerControl, AirConditionerStatus } from '../../shared/air-conditioner'
import { runWithSession } from '../auth/auth-service'
import type { CloudSession } from '../cloud/cloud-auth'
import type { CloudCredentials } from '../cloud/cloud-client'
import { CloudRequestError } from '../cloud/cloud-error'
import { sendTransparentFrame } from '../cloud/cloud-transparent'
import { AC_MESSAGE_TYPES, buildAcFrame, parseAcFrame, type AcFrame } from './ac-frame'
import {
  buildPropertyControlPayload,
  buildPropertyQueryPayload,
  decodePropertyFrame,
  isPropertyStateEmpty,
  mergePropertyState,
  toPropertyStatus,
  type AcPropertyState
} from './ac-property-codec'
import { isSoundEnabled, setSoundEnabled } from './ac-sound-settings'
import {
  applyControl,
  buildControlPayload,
  buildQueryPayload,
  buildScreenDisplayTogglePayload,
  decodeStatusFrame,
  hasStatusControl,
  shouldToggleScreenDisplay,
  toAirConditionerStatus,
  type AcProtocolState
} from './ac-status-codec'

/**
 * 主进程内保存的一台空调的状态: 基础状态帧解码的全量状态与扩展属性.
 */
interface AcDeviceState {
  /**
   * 基础状态 (0xC0 回帧), 作为合成全量控制帧的基础.
   */
  readonly status: AcProtocolState
  /**
   * 扩展属性 (B1 / B0 回帧).
   */
  readonly properties: AcPropertyState
}

/**
 * 每台空调最近一次从回帧解码的状态; 键为 applianceCode.
 */
const latestStates = new Map<string, AcDeviceState>()

/**
 * 每台空调进行中的操作链, 保证同一台空调的查询与控制依次执行, 后一次控制基于前一次的回帧合成.
 */
const operationQueues = new Map<string, Promise<unknown>>()

/**
 * 透传一帧并解析设备回帧.
 * @param credentials 登录凭据.
 * @param session 登录会话.
 * @param applianceCode 设备唯一标识.
 * @param messageType 报文类型.
 * @param payload 随机字节之前的消息体.
 * @returns 已解析的回帧; 设备没有回帧时返回 undefined.
 * @throws CloudRequestError 当云端失败时; AcFrameError 当回帧不符合协议时.
 */
async function exchangeFrame(
  credentials: CloudCredentials,
  session: CloudSession,
  applianceCode: string,
  messageType: number,
  payload: readonly number[]
): Promise<AcFrame | undefined> {
  const reply = await sendTransparentFrame(
    credentials,
    session,
    applianceCode,
    buildAcFrame(messageType, payload)
  )
  return reply === undefined ? undefined : parseAcFrame(reply)
}

/**
 * 查询一台空调的基础状态.
 * @param credentials 登录凭据.
 * @param session 登录会话.
 * @param applianceCode 设备唯一标识.
 * @returns 全量状态.
 * @throws CloudRequestError 当云端失败或设备没有回状态帧时.
 */
async function queryStatus(
  credentials: CloudCredentials,
  session: CloudSession,
  applianceCode: string
): Promise<AcProtocolState> {
  const reply = await exchangeFrame(
    credentials,
    session,
    applianceCode,
    AC_MESSAGE_TYPES.QUERY,
    buildQueryPayload()
  )
  const status = reply === undefined ? undefined : decodeStatusFrame(reply)
  if (status === undefined) {
    throw new CloudRequestError('ac: 查询没有收到状态回帧')
  }
  return status
}

/**
 * 查询一台空调的扩展属性 (防直吹, 上下与左右风向, 智能控温, 智能光感).
 * @param credentials 登录凭据.
 * @param session 登录会话.
 * @param applianceCode 设备唯一标识.
 * @returns 回帧中出现的扩展属性; 设备没有回扩展属性帧时为空.
 * @throws CloudRequestError 当云端失败时.
 */
async function queryProperties(
  credentials: CloudCredentials,
  session: CloudSession,
  applianceCode: string
): Promise<AcPropertyState> {
  const reply = await exchangeFrame(
    credentials,
    session,
    applianceCode,
    AC_MESSAGE_TYPES.QUERY,
    buildPropertyQueryPayload()
  )
  return (reply === undefined ? undefined : decodePropertyFrame(reply)) ?? {}
}

/**
 * 依次查询一台空调的基础状态与扩展属性, 合并后记为最新状态.
 * @param credentials 登录凭据.
 * @param session 登录会话.
 * @param applianceCode 设备唯一标识.
 * @returns 最新状态.
 * @throws CloudRequestError 当云端失败或设备没有回状态帧时.
 */
async function queryState(
  credentials: CloudCredentials,
  session: CloudSession,
  applianceCode: string
): Promise<AcDeviceState> {
  const status = await queryStatus(credentials, session, applianceCode)
  const properties = await queryProperties(credentials, session, applianceCode)
  const state = { status, properties }
  latestStates.set(applianceCode, state)
  return state
}

/**
 * 以最新基础状态加本次变更合成全量控制帧 (0x40) 并下发; 回帧即新状态, 没有回帧时再查询一次.
 * @param credentials 登录凭据.
 * @param session 登录会话.
 * @param applianceCode 设备唯一标识.
 * @param state 当前状态.
 * @param control 要改变的设置.
 * @param isBuzzerOn 这条指令是否让空调鸣响.
 * @returns 控制后的状态.
 * @throws CloudRequestError 当云端失败时.
 */
async function controlStatus(
  credentials: CloudCredentials,
  session: CloudSession,
  applianceCode: string,
  state: AcDeviceState,
  control: AirConditionerControl,
  isBuzzerOn: boolean
): Promise<AcDeviceState> {
  const reply = await exchangeFrame(
    credentials,
    session,
    applianceCode,
    AC_MESSAGE_TYPES.CONTROL,
    buildControlPayload(applyControl(state.status, control), isBuzzerOn)
  )
  const status =
    (reply === undefined ? undefined : decodeStatusFrame(reply)) ??
    (await queryStatus(credentials, session, applianceCode))
  return { ...state, status }
}

/**
 * 下发扩展属性控制帧 (B0); 回帧中出现的属性覆盖原值, 没有回帧或回帧中没有任何属性时重新查询扩展属性.
 * @param credentials 登录凭据.
 * @param session 登录会话.
 * @param applianceCode 设备唯一标识.
 * @param state 当前状态.
 * @param payload 随机字节之前的扩展属性控制负载.
 * @returns 控制后的状态.
 * @throws CloudRequestError 当云端失败时.
 */
async function controlProperties(
  credentials: CloudCredentials,
  session: CloudSession,
  applianceCode: string,
  state: AcDeviceState,
  payload: readonly number[]
): Promise<AcDeviceState> {
  const reply = await exchangeFrame(
    credentials,
    session,
    applianceCode,
    AC_MESSAGE_TYPES.CONTROL,
    payload
  )
  const replyProperties = reply === undefined ? undefined : decodePropertyFrame(reply)
  const update =
    replyProperties === undefined || isPropertyStateEmpty(replyProperties)
      ? await queryProperties(credentials, session, applianceCode)
      : replyProperties
  return { ...state, properties: mergePropertyState(state.properties, update) }
}

/**
 * 把屏幕显示设为目标值: 切换帧只能翻转, 故先重新查询基础状态, 与目标不同时才下发切换帧;
 * 回帧为基础状态帧且已显示目标值时即新状态, 否则 (没有回帧, 或回帧可能是翻转前的快照) 再查询一次.
 * @param credentials 登录凭据.
 * @param session 登录会话.
 * @param applianceCode 设备唯一标识.
 * @param state 当前状态.
 * @param control 要改变的设置.
 * @param isBuzzerOn 这条指令是否让空调鸣响.
 * @returns 控制后的状态.
 * @throws CloudRequestError 当云端失败或设备没有回状态帧时.
 */
async function controlScreenDisplay(
  credentials: CloudCredentials,
  session: CloudSession,
  applianceCode: string,
  state: AcDeviceState,
  control: AirConditionerControl,
  isBuzzerOn: boolean
): Promise<AcDeviceState> {
  const currentStatus = await queryStatus(credentials, session, applianceCode)
  if (!shouldToggleScreenDisplay(currentStatus, control)) {
    return { ...state, status: currentStatus }
  }
  const reply = await exchangeFrame(
    credentials,
    session,
    applianceCode,
    AC_MESSAGE_TYPES.QUERY,
    buildScreenDisplayTogglePayload(isBuzzerOn)
  )
  const replyStatus = reply === undefined ? undefined : decodeStatusFrame(reply)
  const status =
    replyStatus !== undefined && !shouldToggleScreenDisplay(replyStatus, control)
      ? replyStatus
      : await queryStatus(credentials, session, applianceCode)
  return { ...state, status }
}

/**
 * 按控制字段分派: 基础状态字段经 0x40 帧下发, 扩展属性经 B0 帧下发, 屏幕显示经切换帧下发;
 * 每帧的蜂鸣跟随本地声音设置; 没有最新状态时先查询.
 * @param credentials 登录凭据.
 * @param session 登录会话.
 * @param applianceCode 设备唯一标识.
 * @param control 要改变的设置.
 * @param isBuzzerOn 本次各帧是否让空调鸣响.
 * @returns 控制后的状态.
 * @throws CloudRequestError 当云端失败时.
 */
async function controlState(
  credentials: CloudCredentials,
  session: CloudSession,
  applianceCode: string,
  control: AirConditionerControl,
  isBuzzerOn: boolean
): Promise<AcDeviceState> {
  let state =
    latestStates.get(applianceCode) ?? (await queryState(credentials, session, applianceCode))
  if (hasStatusControl(control)) {
    state = await controlStatus(credentials, session, applianceCode, state, control, isBuzzerOn)
    latestStates.set(applianceCode, state)
  }
  const propertyPayload = buildPropertyControlPayload(control, isBuzzerOn)
  if (propertyPayload !== undefined) {
    state = await controlProperties(credentials, session, applianceCode, state, propertyPayload)
    latestStates.set(applianceCode, state)
  }
  if (control.isScreenDisplayOn !== undefined) {
    state = await controlScreenDisplay(
      credentials,
      session,
      applianceCode,
      state,
      control,
      isBuzzerOn
    )
    latestStates.set(applianceCode, state)
  }
  return state
}

/**
 * 把主进程内的状态与本地声音设置转换为设置页状态.
 * @param state 一台空调的状态.
 * @param isSoundOn 本地声音设置.
 * @returns 设置页状态.
 */
function toStatus(state: AcDeviceState, isSoundOn: boolean): AirConditionerStatus {
  return {
    ...toAirConditionerStatus(state.status),
    ...toPropertyStatus(state.properties),
    isSoundOn
  }
}

/**
 * 把操作排到同一台空调的操作链末尾执行; 前一次操作失败不影响后一次.
 * @param applianceCode 设备唯一标识.
 * @param operation 要执行的操作.
 * @returns 操作结果.
 */
function enqueue<T>(applianceCode: string, operation: () => Promise<T>): Promise<T> {
  const previous = operationQueues.get(applianceCode) ?? Promise.resolve()
  const current = previous.catch(() => undefined).then(operation)
  operationQueues.set(applianceCode, current)
  return current.finally(() => {
    if (operationQueues.get(applianceCode) === current) {
      operationQueues.delete(applianceCode)
    }
  })
}

/**
 * 从云端同步一台空调的当前状态; 令牌失效时经会话续期后重试.
 * @param applianceCode 设备唯一标识.
 * @returns 设置页状态.
 * @throws NotLoggedInError 当没有登录会话时.
 * @throws CloudSessionExpiredError 当令牌无法续期时.
 * @throws CloudRequestError 当云端失败 (如设备离线) 时; 网络错误原样抛出.
 */
export function getAirConditionerStatus(applianceCode: string): Promise<AirConditionerStatus> {
  return enqueue(applianceCode, async () =>
    toStatus(
      await runWithSession((credentials, session) =>
        queryState(credentials, session, applianceCode)
      ),
      await isSoundEnabled(applianceCode)
    )
  )
}

/**
 * 取主进程已知的一台空调最新状态, 不访问云端; 控制失败时用于让界面显示前几步已生效的变更.
 * @param applianceCode 设备唯一标识.
 * @returns 设置页状态; 尚未成功查询过时返回 undefined.
 */
export async function getLatestAirConditionerStatus(
  applianceCode: string
): Promise<AirConditionerStatus | undefined> {
  const state = latestStates.get(applianceCode)
  return state === undefined ? undefined : toStatus(state, await isSoundEnabled(applianceCode))
}

/**
 * 向一台空调下发控制: 以最新状态为基础只改变目标字段, 合成全量控制帧; 令牌失效时经会话续期后重试.
 * 控制中含声音时先保存本地声音设置, 再下发声音总开关同步设备端, 下发失败不影响已保存的设置;
 * 各帧的蜂鸣跟随 (保存后的) 本地声音设置.
 * @param applianceCode 设备唯一标识.
 * @param control 要改变的设置.
 * @returns 控制后的设置页状态.
 * @throws NotLoggedInError 当没有登录会话时.
 * @throws CloudSessionExpiredError 当令牌无法续期时.
 * @throws CloudRequestError 当云端失败 (如设备离线) 时; 网络错误原样抛出.
 */
export function controlAirConditioner(
  applianceCode: string,
  control: AirConditionerControl
): Promise<AirConditionerStatus> {
  return enqueue(applianceCode, async () => {
    if (control.isSoundOn !== undefined) {
      await setSoundEnabled(applianceCode, control.isSoundOn)
    }
    const isSoundOn = await isSoundEnabled(applianceCode)
    const state = await runWithSession((credentials, session) =>
      controlState(credentials, session, applianceCode, control, isSoundOn)
    )
    return toStatus(state, isSoundOn)
  })
}
