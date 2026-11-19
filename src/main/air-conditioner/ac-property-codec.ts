import {
  HORIZONTAL_AIRFLOW_DIRECTIONS,
  VERTICAL_AIRFLOW_DIRECTIONS,
  type AirConditionerControl,
  type AirConditionerStatus,
  type HorizontalAirflowDirection,
  type VerticalAirflowDirection
} from '../../shared/air-conditioner'
import { AC_MESSAGE_TYPES, type AcFrame } from './ac-frame'

/**
 * 扩展属性查询 (B1) 的命令字, 回帧沿用同一命令字.
 */
const PROPERTY_QUERY_COMMAND = 0xb1

/**
 * 扩展属性控制 (B0) 的命令字, 回帧沿用同一命令字.
 */
const PROPERTY_CONTROL_COMMAND = 0xb0

/**
 * 扩展属性的属性号, 与 v96 版 Lua 一致.
 */
const PROPERTY_IDS = {
  /**
   * 防直吹.
   */
  PREVENT_STRAIGHT_WIND: 0x0042,
  /**
   * 上下风向.
   */
  VERTICAL_DIRECTION: 0x0009,
  /**
   * 左右风向.
   */
  HORIZONTAL_DIRECTION: 0x000a,
  /**
   * 单条指令的蜂鸣; v96 版 Lua 在每个 B0 控制帧中都附带该属性.
   */
  BUZZER: 0x001a,
  /**
   * 智能控温.
   */
  INTELLIGENT_CONTROL: 0x0031,
  /**
   * 声音总开关 (buzzer_all); 只下发以同步设备端, 不查询, 不回读 (美居 App 同样把声音存为本地设置).
   */
  BUZZER_ALL: 0x022c,
  /**
   * 智能光感.
   */
  LIGHT_SENSITIVE: 0x0208
} as const

/**
 * 设置页同步时查询的扩展属性, 数组顺序即查询帧中的顺序.
 */
const QUERIED_PROPERTY_IDS: readonly number[] = [
  PROPERTY_IDS.PREVENT_STRAIGHT_WIND,
  PROPERTY_IDS.VERTICAL_DIRECTION,
  PROPERTY_IDS.HORIZONTAL_DIRECTION,
  PROPERTY_IDS.INTELLIGENT_CONTROL,
  PROPERTY_IDS.LIGHT_SENSITIVE
]

/**
 * 布尔型属性 (单条指令蜂鸣, 智能控温, 声音总开关) 的取值, 与 v96 版 Lua 及该机型 App 插件 JS 一致.
 */
const SWITCH_VALUES = {
  /**
   * 关.
   */
  OFF: 0,
  /**
   * 开.
   */
  ON: 1
} as const

/**
 * 智能光感属性的取值; 依据该机型 App 插件 JS (开 3, 关 0), 回帧中非 0 即视为开启.
 */
const LIGHT_SENSITIVE_VALUES = {
  /**
   * 关.
   */
  OFF: 0,
  /**
   * 开.
   */
  ON: 3
} as const

/**
 * 防直吹属性的取值; 依据该机型 App 插件 JS (开 2, 关 1) 与实测回帧.
 */
const PREVENT_STRAIGHT_WIND_VALUES = {
  /**
   * 关.
   */
  OFF: 1,
  /**
   * 开.
   */
  ON: 2
} as const

/**
 * 上下风向档位与属性值的对应, 依据该机型 App 插件 JS: 1, 25, 50, 75, 100 (1 = 顶部).
 */
const VERTICAL_DIRECTION_VALUES: Readonly<Record<VerticalAirflowDirection, number>> = {
  top: 1,
  upper: 25,
  middle: 50,
  lower: 75,
  bottom: 100
}

/**
 * 左右风向档位与属性值的对应, 依据该机型 App 插件 JS: 1, 25, 50, 75, 100 (1 = 最左).
 */
const HORIZONTAL_DIRECTION_VALUES: Readonly<Record<HorizontalAirflowDirection, number>> = {
  left: 1,
  leftCenter: 25,
  center: 50,
  rightCenter: 75,
  right: 100
}

/**
 * 回帧中每个属性在取值之前的字节数: 属性号低字节, 高字节, 属性头, 长度.
 */
const REPLY_PROPERTY_HEADER_LENGTH = 4

/**
 * 回帧消息体中第一个属性的下标 (命令字与属性数之后).
 */
const FIRST_PROPERTY_INDEX = 2

/**
 * 下发的单字节属性的取值长度.
 */
const SINGLE_BYTE_LENGTH = 1

/**
 * 一个字节的掩码.
 */
const BYTE_MASK = 0xff

/**
 * 一个字节的位数.
 */
const BITS_PER_BYTE = 8

/**
 * 主进程内保存的扩展属性: 各属性的原始单字节取值; 空调未上报的属性为 undefined.
 */
export interface AcPropertyState {
  /**
   * 防直吹属性值.
   */
  readonly preventStraightWindValue?: number
  /**
   * 上下风向属性值.
   */
  readonly verticalDirectionValue?: number
  /**
   * 左右风向属性值.
   */
  readonly horizontalDirectionValue?: number
  /**
   * 智能控温属性值.
   */
  readonly intelligentControlValue?: number
  /**
   * 智能光感属性值.
   */
  readonly lightSensitiveValue?: number
}

/**
 * 一个要下发的单字节属性.
 */
interface PropertyWrite {
  /**
   * 属性号.
   */
  readonly id: number
  /**
   * 取值.
   */
  readonly value: number
}

/**
 * 把属性号写成低字节在前的两个字节.
 * @param id 属性号.
 * @returns 两个字节.
 */
function encodePropertyId(id: number): readonly number[] {
  return [id & BYTE_MASK, (id >> BITS_PER_BYTE) & BYTE_MASK]
}

/**
 * 把布尔开关编码为布尔型属性的取值.
 * @param isOn 是否开启.
 * @returns 属性取值.
 */
function toSwitchValue(isOn: boolean): number {
  return isOn ? SWITCH_VALUES.ON : SWITCH_VALUES.OFF
}

/**
 * 把布尔型属性的取值解码为开关状态; 非 0 即视为开启.
 * @param value 属性取值.
 * @returns 开关状态; 空调未上报时返回 undefined.
 */
function toSwitchState(value: number | undefined): boolean | undefined {
  return value === undefined ? undefined : value !== SWITCH_VALUES.OFF
}

/**
 * 扩展属性查询帧 (B1) 的负载: 依次查询防直吹, 上下风向, 左右风向, 智能控温与智能光感.
 * @returns 随机字节之前的查询负载.
 */
export function buildPropertyQueryPayload(): readonly number[] {
  return [
    PROPERTY_QUERY_COMMAND,
    QUERIED_PROPERTY_IDS.length,
    ...QUERIED_PROPERTY_IDS.flatMap(encodePropertyId)
  ]
}

/**
 * 从一次控制中取出由扩展属性控制帧 (B0) 承载的属性.
 * 有任一属性时按 v96 版 Lua 附带单条指令蜂鸣属性.
 * @param control 要改变的设置.
 * @param isBuzzerOn 这条指令是否让空调鸣响.
 * @returns 要下发的属性, 顺序同 v96 版 Lua 0xB0 分支; 控制中没有扩展属性时为空.
 */
function collectPropertyWrites(
  control: AirConditionerControl,
  isBuzzerOn: boolean
): readonly PropertyWrite[] {
  const writes: PropertyWrite[] = []
  if (control.isPreventStraightWind !== undefined) {
    writes.push({
      id: PROPERTY_IDS.PREVENT_STRAIGHT_WIND,
      value: control.isPreventStraightWind
        ? PREVENT_STRAIGHT_WIND_VALUES.ON
        : PREVENT_STRAIGHT_WIND_VALUES.OFF
    })
  }
  const buzzerIndex = writes.length
  if (control.verticalAirflowDirection !== undefined) {
    writes.push({
      id: PROPERTY_IDS.VERTICAL_DIRECTION,
      value: VERTICAL_DIRECTION_VALUES[control.verticalAirflowDirection]
    })
  }
  if (control.horizontalAirflowDirection !== undefined) {
    writes.push({
      id: PROPERTY_IDS.HORIZONTAL_DIRECTION,
      value: HORIZONTAL_DIRECTION_VALUES[control.horizontalAirflowDirection]
    })
  }
  if (control.isIntelligentControl !== undefined) {
    writes.push({
      id: PROPERTY_IDS.INTELLIGENT_CONTROL,
      value: toSwitchValue(control.isIntelligentControl)
    })
  }
  if (control.isSoundOn !== undefined) {
    writes.push({ id: PROPERTY_IDS.BUZZER_ALL, value: toSwitchValue(control.isSoundOn) })
  }
  if (control.isLightSensitive !== undefined) {
    writes.push({
      id: PROPERTY_IDS.LIGHT_SENSITIVE,
      value: control.isLightSensitive ? LIGHT_SENSITIVE_VALUES.ON : LIGHT_SENSITIVE_VALUES.OFF
    })
  }
  if (writes.length === 0) {
    return writes
  }
  return [
    ...writes.slice(0, buzzerIndex),
    { id: PROPERTY_IDS.BUZZER, value: toSwitchValue(isBuzzerOn) },
    ...writes.slice(buzzerIndex)
  ]
}

/**
 * 把一次控制中的扩展属性编码为扩展属性控制帧 (B0) 的负载, 每个属性为 [属性号低, 属性号高, 长度, 取值].
 * @param control 要改变的设置.
 * @param isBuzzerOn 这条指令是否让空调鸣响.
 * @returns 随机字节之前的控制负载; 控制中没有扩展属性时返回 undefined.
 */
export function buildPropertyControlPayload(
  control: AirConditionerControl,
  isBuzzerOn: boolean
): readonly number[] | undefined {
  const writes = collectPropertyWrites(control, isBuzzerOn)
  if (writes.length === 0) {
    return undefined
  }
  return [
    PROPERTY_CONTROL_COMMAND,
    writes.length,
    ...writes.flatMap(({ id, value }) => [...encodePropertyId(id), SINGLE_BYTE_LENGTH, value])
  ]
}

/**
 * 解析回帧消息体中的属性列表, 每个属性为 [属性号低, 属性号高, 属性头, 长度, 取值 × 长度].
 * 按属性数与长度逐个读取, 越界时停止.
 * @param body 回帧消息体.
 * @returns 属性号到取值字节的映射.
 */
function parseReplyProperties(body: readonly number[]): ReadonlyMap<number, readonly number[]> {
  const properties = new Map<number, readonly number[]>()
  const propertyCount = body[1]
  let cursor = FIRST_PROPERTY_INDEX
  for (let index = 0; index < propertyCount; index += 1) {
    const valueStart = cursor + REPLY_PROPERTY_HEADER_LENGTH
    if (valueStart > body.length) {
      break
    }
    const valueEnd = valueStart + body[valueStart - 1]
    if (valueEnd > body.length) {
      break
    }
    properties.set(
      body[cursor] | (body[cursor + 1] << BITS_PER_BYTE),
      body.slice(valueStart, valueEnd)
    )
    cursor = valueEnd
  }
  return properties
}

/**
 * 读取单字节属性的取值.
 * @param properties 属性号到取值字节的映射.
 * @param id 属性号.
 * @returns 取值; 回帧没有该属性或取值为空时返回 undefined.
 */
function readSingleByte(
  properties: ReadonlyMap<number, readonly number[]>,
  id: number
): number | undefined {
  return properties.get(id)?.[0]
}

/**
 * 把扩展属性回帧 (B1 查询回帧或 B0 控制回帧) 解码为扩展属性; 只含回帧中出现的属性.
 * @param frame 已解析的回帧.
 * @returns 扩展属性; 不是扩展属性回帧时返回 undefined.
 */
export function decodePropertyFrame(frame: AcFrame): AcPropertyState | undefined {
  const { messageType, body } = frame
  const isQueryReply = messageType === AC_MESSAGE_TYPES.QUERY && body[0] === PROPERTY_QUERY_COMMAND
  const isControlReply =
    messageType === AC_MESSAGE_TYPES.CONTROL && body[0] === PROPERTY_CONTROL_COMMAND
  if (!isQueryReply && !isControlReply) {
    return undefined
  }
  const properties = parseReplyProperties(body)
  const preventStraightWindValue = readSingleByte(properties, PROPERTY_IDS.PREVENT_STRAIGHT_WIND)
  const verticalDirectionValue = readSingleByte(properties, PROPERTY_IDS.VERTICAL_DIRECTION)
  const horizontalDirectionValue = readSingleByte(properties, PROPERTY_IDS.HORIZONTAL_DIRECTION)
  const intelligentControlValue = readSingleByte(properties, PROPERTY_IDS.INTELLIGENT_CONTROL)
  const lightSensitiveValue = readSingleByte(properties, PROPERTY_IDS.LIGHT_SENSITIVE)
  return {
    ...(preventStraightWindValue !== undefined && { preventStraightWindValue }),
    ...(verticalDirectionValue !== undefined && { verticalDirectionValue }),
    ...(horizontalDirectionValue !== undefined && { horizontalDirectionValue }),
    ...(intelligentControlValue !== undefined && { intelligentControlValue }),
    ...(lightSensitiveValue !== undefined && { lightSensitiveValue })
  }
}

/**
 * 判断解码出的扩展属性是否一个属性都没有.
 * @param state 扩展属性.
 * @returns 没有任何属性时返回 true.
 */
export function isPropertyStateEmpty(state: AcPropertyState): boolean {
  return (
    state.preventStraightWindValue === undefined &&
    state.verticalDirectionValue === undefined &&
    state.horizontalDirectionValue === undefined &&
    state.intelligentControlValue === undefined &&
    state.lightSensitiveValue === undefined
  )
}

/**
 * 以新回帧中出现的属性覆盖已有扩展属性, 回帧中没有的属性保持原值.
 * @param current 已有扩展属性.
 * @param update 新回帧解码出的扩展属性.
 * @returns 合并后的扩展属性.
 */
export function mergePropertyState(
  current: AcPropertyState,
  update: AcPropertyState
): AcPropertyState {
  return { ...current, ...update }
}

/**
 * 由属性值反查风向档位.
 * @param directions 全部档位.
 * @param values 档位与属性值的对应.
 * @param value 属性值.
 * @returns 档位; 属性值不在五档之内时返回 undefined.
 */
function toDirection<T extends string>(
  directions: readonly T[],
  values: Readonly<Record<T, number>>,
  value: number | undefined
): T | undefined {
  return value === undefined
    ? undefined
    : directions.find((direction) => values[direction] === value)
}

/**
 * 把扩展属性转换为设置页状态中由扩展属性承载的部分; 防直吹取值为开时视为开启, 其它值 (关, 0 等) 视为关闭;
 * 智能控温与智能光感取值非 0 即视为开启.
 * @param state 扩展属性.
 * @returns 设置页状态的扩展属性部分.
 */
export function toPropertyStatus(
  state: AcPropertyState
): Pick<
  AirConditionerStatus,
  | 'isPreventStraightWind'
  | 'verticalAirflowDirection'
  | 'horizontalAirflowDirection'
  | 'isIntelligentControl'
  | 'isLightSensitive'
> {
  return {
    isPreventStraightWind:
      state.preventStraightWindValue === undefined
        ? undefined
        : state.preventStraightWindValue === PREVENT_STRAIGHT_WIND_VALUES.ON,
    verticalAirflowDirection: toDirection(
      VERTICAL_AIRFLOW_DIRECTIONS,
      VERTICAL_DIRECTION_VALUES,
      state.verticalDirectionValue
    ),
    horizontalAirflowDirection: toDirection(
      HORIZONTAL_AIRFLOW_DIRECTIONS,
      HORIZONTAL_DIRECTION_VALUES,
      state.horizontalDirectionValue
    ),
    isIntelligentControl: toSwitchState(state.intelligentControlValue),
    isLightSensitive: toSwitchState(state.lightSensitiveValue)
  }
}
