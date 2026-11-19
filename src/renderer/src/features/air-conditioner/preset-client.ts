import type { AirConditionerStatusResult } from '../../../../shared/air-conditioner'
import type {
  AirConditionerPreset,
  AirConditionerPresetError,
  AirConditionerPresetsApi
} from '../../../../shared/air-conditioner-presets'

/**
 * 渲染进程看到的预设操作失败原因: 主进程给出的拒绝原因, 或 invocationFailed (IPC 调用本身异常,
 * 请求没有得到主进程的答复, 可重试).
 */
export type PresetClientError = AirConditionerPresetError | 'invocationFailed'

/**
 * 渲染进程看到的读取, 保存, 改名, 覆盖, 删除预设的结果; 成功时带该空调 (操作后) 的全部预设.
 */
export type PresetClientResult =
  | { readonly ok: true; readonly presets: readonly AirConditionerPreset[] }
  | { readonly ok: false; readonly error: PresetClientError }

/**
 * IPC 调用本身异常 (而非主进程拒绝) 时的预设操作结果.
 */
const INVOCATION_FAILED_RESULT: PresetClientResult = { ok: false, error: 'invocationFailed' }

/**
 * 非 Electron 环境 (如浏览器预览) 下的调用: 总是以异常结束, 由调用方按 IPC 调用异常处理.
 * @returns 被拒绝的 Promise.
 */
function rejectDetachedCall(): Promise<never> {
  return Promise.reject(new Error('air-conditioner-presets: preload 桥不可用'))
}

/**
 * 非 Electron 环境 (如浏览器预览) 下的空实现: 每个调用都以异常结束.
 */
const DETACHED_PRESETS: AirConditionerPresetsApi = {
  list: rejectDetachedCall,
  saveCurrent: rejectDetachedCall,
  rename: rejectDetachedCall,
  overwrite: rejectDetachedCall,
  remove: rejectDetachedCall,
  apply: rejectDetachedCall
}

/**
 * 渲染进程访问空调预设能力的唯一入口, 屏蔽 preload 桥是否存在的差异.
 */
const presetsClient: AirConditionerPresetsApi =
  window.api?.airConditionerPresets ?? DETACHED_PRESETS

/**
 * 发起一次预设相关的跨进程调用, 把 IPC 调用本身的异常转换为给定的失败结果.
 * @param operation 发起调用的函数.
 * @param fallback IPC 异常时返回的结果.
 * @param description 写入日志的调用说明.
 * @returns 调用结果; IPC 异常时为 fallback.
 */
async function invokePresets<T>(
  operation: () => Promise<T>,
  fallback: T,
  description: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    console.error(`air-conditioner-presets: ${description}调用失败`, error)
    return fallback
  }
}

/**
 * 取一台空调的全部预设.
 * @param applianceCode 设备唯一标识.
 * @returns 读取结果; 预设文件无法读取时为 fileUnreadable, IPC 调用异常时为 invocationFailed.
 */
export function loadPresets(applianceCode: string): Promise<PresetClientResult> {
  return invokePresets<PresetClientResult>(
    () => presetsClient.list(applianceCode),
    INVOCATION_FAILED_RESULT,
    '读取预设'
  )
}

/**
 * 请主进程把一台空调当前的设置保存为一套新预设.
 * @param applianceCode 设备唯一标识.
 * @param name 用户输入的名称.
 * @returns 保存结果; IPC 调用异常时为 invocationFailed.
 */
export function saveCurrentAsPreset(
  applianceCode: string,
  name: string
): Promise<PresetClientResult> {
  return invokePresets<PresetClientResult>(
    () => presetsClient.saveCurrent(applianceCode, name),
    INVOCATION_FAILED_RESULT,
    '保存预设'
  )
}

/**
 * 请主进程给一套预设改名.
 * @param applianceCode 设备唯一标识.
 * @param presetId 预设唯一标识.
 * @param name 用户输入的新名称.
 * @returns 改名结果; IPC 调用异常时为 invocationFailed.
 */
export function renamePreset(
  applianceCode: string,
  presetId: string,
  name: string
): Promise<PresetClientResult> {
  return invokePresets<PresetClientResult>(
    () => presetsClient.rename(applianceCode, presetId, name),
    INVOCATION_FAILED_RESULT,
    '预设改名'
  )
}

/**
 * 请主进程用一台空调当前的设置覆盖一套预设.
 * @param applianceCode 设备唯一标识.
 * @param presetId 预设唯一标识.
 * @returns 覆盖结果; IPC 调用异常时为 invocationFailed.
 */
export function overwritePreset(
  applianceCode: string,
  presetId: string
): Promise<PresetClientResult> {
  return invokePresets<PresetClientResult>(
    () => presetsClient.overwrite(applianceCode, presetId),
    INVOCATION_FAILED_RESULT,
    '覆盖预设'
  )
}

/**
 * 请主进程删除一套预设.
 * @param applianceCode 设备唯一标识.
 * @param presetId 预设唯一标识.
 * @returns 删除结果; IPC 调用异常时为 invocationFailed.
 */
export function removePreset(applianceCode: string, presetId: string): Promise<PresetClientResult> {
  return invokePresets<PresetClientResult>(
    () => presetsClient.remove(applianceCode, presetId),
    INVOCATION_FAILED_RESULT,
    '删除预设'
  )
}

/**
 * 请主进程应用一套预设: 空调开机并切换到预设的全部设置.
 * @param applianceCode 设备唯一标识.
 * @param presetId 预设唯一标识.
 * @returns 应用后的状态结果; IPC 异常时为不带原因的失败 (界面显示应用失败的通用文案).
 */
export function applyPreset(
  applianceCode: string,
  presetId: string
): Promise<AirConditionerStatusResult> {
  return invokePresets<AirConditionerStatusResult>(
    () => presetsClient.apply(applianceCode, presetId),
    { ok: false },
    '应用预设'
  )
}
