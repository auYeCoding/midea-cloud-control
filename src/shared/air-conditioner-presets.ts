import type { AirConditionerControl, AirConditionerStatusResult } from './air-conditioner'

/**
 * 空调预设相关的 IPC 通道名, 主进程与 preload 共用的唯一定义.
 */
export const AIR_CONDITIONER_PRESET_CHANNELS = {
  LIST: 'air-conditioner-presets:list',
  SAVE_CURRENT: 'air-conditioner-presets:save-current',
  RENAME: 'air-conditioner-presets:rename',
  OVERWRITE: 'air-conditioner-presets:overwrite',
  REMOVE: 'air-conditioner-presets:remove',
  APPLY: 'air-conditioner-presets:apply'
} as const

/**
 * 预设名称的最大字符数 (按 Unicode 字符计, 首尾空白不计入).
 */
export const PRESET_NAME_MAX_LENGTH = 20

/**
 * 预设保存的设置字段, 即除开关机外的全部控制字段; 是预设内容的唯一定义,
 * 保存时从空调状态中取这些字段, 读取预设文件时也只认这些字段.
 */
export const PRESET_SETTING_FIELDS = [
  'targetTemperature',
  'mode',
  'fanSpeed',
  'isSwingUpDown',
  'isSwingLeftRight',
  'isPreventStraightWind',
  'verticalAirflowDirection',
  'horizontalAirflowDirection',
  'isEco',
  'isElectricHeating',
  'isComfortPowerSave',
  'isIntelligentControl',
  'isScreenDisplayOn',
  'isSoundOn',
  'isAntiMildew',
  'isLightSensitive'
] as const satisfies readonly (keyof AirConditionerControl)[]

/**
 * 预设保存的设置字段名.
 */
export type PresetSettingField = (typeof PRESET_SETTING_FIELDS)[number]

/**
 * 一套预设的设置: 保存时空调的完整设置 (不含开关机); 空调未上报的字段不出现.
 * 应用时补上开机, 作为一次控制下发.
 */
export type AirConditionerPresetSettings = Pick<AirConditionerControl, PresetSettingField>

/**
 * 一台空调的一套命名预设.
 */
export interface AirConditionerPreset {
  /**
   * 预设唯一标识.
   */
  readonly id: string
  /**
   * 预设名称, 同一台空调内不重名.
   */
  readonly name: string
  /**
   * 预设的设置.
   */
  readonly settings: AirConditionerPresetSettings
  /**
   * 最近一次保存或覆盖设置的时间, Unix 毫秒时间戳.
   */
  readonly updatedAt: number
}

/**
 * 预设操作被拒绝或失败的原因: 名称为空, 名称过长, 与本空调已有预设重名, 预设不存在,
 * 主进程尚无该空调的状态可保存, 写入预设文件失败, 预设文件存在但无法读取或内容无效
 * (此时拒绝一切修改, 原文件保持不动).
 */
export type AirConditionerPresetError =
  | 'emptyName'
  | 'nameTooLong'
  | 'duplicateName'
  | 'notFound'
  | 'statusUnavailable'
  | 'storageFailed'
  | 'fileUnreadable'

/**
 * 读取, 保存, 改名, 覆盖, 删除预设的结果; 成功时带该空调 (操作后) 的全部预设.
 */
export type AirConditionerPresetsResult =
  | { readonly ok: true; readonly presets: readonly AirConditionerPreset[] }
  | { readonly ok: false; readonly error: AirConditionerPresetError }

/**
 * preload 暴露给渲染进程的空调预设能力; 预设按设备唯一标识分别保存在主进程.
 */
export interface AirConditionerPresetsApi {
  /**
   * 取一台空调的全部预设, 按保存顺序排列; 预设文件无法读取或内容无效时返回失败.
   */
  readonly list: (applianceCode: string) => Promise<AirConditionerPresetsResult>
  /**
   * 把一台空调当前的设置保存为一套新预设.
   */
  readonly saveCurrent: (
    applianceCode: string,
    name: string
  ) => Promise<AirConditionerPresetsResult>
  /**
   * 给一套预设改名.
   */
  readonly rename: (
    applianceCode: string,
    presetId: string,
    name: string
  ) => Promise<AirConditionerPresetsResult>
  /**
   * 用一台空调当前的设置覆盖一套预设的设置.
   */
  readonly overwrite: (
    applianceCode: string,
    presetId: string
  ) => Promise<AirConditionerPresetsResult>
  /**
   * 删除一套预设.
   */
  readonly remove: (applianceCode: string, presetId: string) => Promise<AirConditionerPresetsResult>
  /**
   * 应用一套预设: 空调开机并切换到预设的全部设置, 返回应用后的状态; 预设本身不变.
   */
  readonly apply: (applianceCode: string, presetId: string) => Promise<AirConditionerStatusResult>
}
