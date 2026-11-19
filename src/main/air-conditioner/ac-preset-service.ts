import { randomUUID } from 'node:crypto'

import type { AirConditionerStatus } from '../../shared/air-conditioner'
import {
  PRESET_NAME_MAX_LENGTH,
  PRESET_SETTING_FIELDS,
  type AirConditionerPreset,
  type AirConditionerPresetError,
  type AirConditionerPresetSettings,
  type AirConditionerPresetsResult
} from '../../shared/air-conditioner-presets'
import { listDevicePresets, updateDevicePresets } from './ac-preset-store'
import { controlAirConditioner, getLatestAirConditionerStatus } from './ac-service'

/**
 * 预设名称的校验结果: 通过时带去掉首尾空白后的名称.
 */
type PresetNameCheck =
  | { readonly ok: true; readonly name: string }
  | { readonly ok: false; readonly error: AirConditionerPresetError }

/**
 * 应用预设时预设已不存在.
 */
class PresetNotFoundError extends Error {
  /**
   * 创建预设不存在错误.
   * @param presetId 预设唯一标识.
   */
  constructor(presetId: string) {
    super(`air-conditioner-presets: 预设不存在 (${presetId})`)
    this.name = 'PresetNotFoundError'
  }
}

/**
 * 应用预设时预设文件无法读取或内容无效.
 */
class PresetFileUnreadableError extends Error {
  /**
   * 创建预设文件无法读取错误.
   */
  constructor() {
    super('air-conditioner-presets: 预设文件无法读取或内容无效')
    this.name = 'PresetFileUnreadableError'
  }
}

/**
 * 校验预设名称: 去掉首尾空白后不能为空, 不能超过长度上限, 不能与本空调其它预设重名.
 * @param name 用户输入的名称.
 * @param presets 本空调当前的预设.
 * @param excludedPresetId 改名时被改名的预设, 不与自身比较重名.
 * @returns 校验结果.
 */
function checkPresetName(
  name: string,
  presets: readonly AirConditionerPreset[],
  excludedPresetId?: string
): PresetNameCheck {
  const trimmedName = name.trim()
  if (trimmedName.length === 0) {
    return { ok: false, error: 'emptyName' }
  }
  if ([...trimmedName].length > PRESET_NAME_MAX_LENGTH) {
    return { ok: false, error: 'nameTooLong' }
  }
  const isDuplicate = presets.some(
    (preset) => preset.id !== excludedPresetId && preset.name === trimmedName
  )
  return isDuplicate ? { ok: false, error: 'duplicateName' } : { ok: true, name: trimmedName }
}

/**
 * 从设置页状态中取出预设保存的设置; 空调未上报的字段不写入.
 * @param status 设置页状态.
 * @returns 预设设置.
 */
function toPresetSettings(status: AirConditionerStatus): AirConditionerPresetSettings {
  return Object.fromEntries(
    PRESET_SETTING_FIELDS.flatMap((field) =>
      status[field] === undefined ? [] : [[field, status[field]]]
    )
  ) as AirConditionerPresetSettings
}

/**
 * 取主进程已知的一台空调最新设置, 用于保存或覆盖预设.
 * @param applianceCode 设备唯一标识.
 * @returns 预设设置; 主进程尚未成功查询过该空调时返回 undefined.
 */
async function getCurrentSettings(
  applianceCode: string
): Promise<AirConditionerPresetSettings | undefined> {
  const status = await getLatestAirConditionerStatus(applianceCode)
  return status === undefined ? undefined : toPresetSettings(status)
}

/**
 * 取一台空调的全部预设.
 * @param applianceCode 设备唯一标识.
 * @returns 成功时带预设 (按保存顺序排列); 预设文件无法读取或内容无效时为 fileUnreadable.
 */
export function listAirConditionerPresets(
  applianceCode: string
): Promise<AirConditionerPresetsResult> {
  return listDevicePresets(applianceCode)
}

/**
 * 把一台空调当前的设置 (主进程已知的最新状态, 与设置页显示一致) 保存为一套新预设.
 * @param applianceCode 设备唯一标识.
 * @param name 用户输入的名称.
 * @returns 保存后的全部预设, 或拒绝原因.
 */
export async function saveCurrentAsPreset(
  applianceCode: string,
  name: string
): Promise<AirConditionerPresetsResult> {
  const settings = await getCurrentSettings(applianceCode)
  if (settings === undefined) {
    return { ok: false, error: 'statusUnavailable' }
  }
  return updateDevicePresets(applianceCode, (presets) => {
    const nameCheck = checkPresetName(name, presets)
    if (!nameCheck.ok) {
      return nameCheck
    }
    const preset: AirConditionerPreset = {
      id: randomUUID(),
      name: nameCheck.name,
      settings,
      updatedAt: Date.now()
    }
    return { ok: true, presets: [...presets, preset] }
  })
}

/**
 * 给一套预设改名.
 * @param applianceCode 设备唯一标识.
 * @param presetId 预设唯一标识.
 * @param name 用户输入的新名称.
 * @returns 改名后的全部预设, 或拒绝原因.
 */
export function renamePreset(
  applianceCode: string,
  presetId: string,
  name: string
): Promise<AirConditionerPresetsResult> {
  return updateDevicePresets(applianceCode, (presets) => {
    if (!presets.some((preset) => preset.id === presetId)) {
      return { ok: false, error: 'notFound' }
    }
    const nameCheck = checkPresetName(name, presets, presetId)
    if (!nameCheck.ok) {
      return nameCheck
    }
    return {
      ok: true,
      presets: presets.map((preset) =>
        preset.id === presetId ? { ...preset, name: nameCheck.name } : preset
      )
    }
  })
}

/**
 * 用一台空调当前的设置覆盖一套预设的设置, 名称不变.
 * @param applianceCode 设备唯一标识.
 * @param presetId 预设唯一标识.
 * @returns 覆盖后的全部预设, 或拒绝原因.
 */
export async function overwritePreset(
  applianceCode: string,
  presetId: string
): Promise<AirConditionerPresetsResult> {
  const settings = await getCurrentSettings(applianceCode)
  if (settings === undefined) {
    return { ok: false, error: 'statusUnavailable' }
  }
  return updateDevicePresets(applianceCode, (presets) => {
    if (!presets.some((preset) => preset.id === presetId)) {
      return { ok: false, error: 'notFound' }
    }
    const updatedAt = Date.now()
    return {
      ok: true,
      presets: presets.map((preset) =>
        preset.id === presetId ? { ...preset, settings, updatedAt } : preset
      )
    }
  })
}

/**
 * 删除一套预设.
 * @param applianceCode 设备唯一标识.
 * @param presetId 预设唯一标识.
 * @returns 删除后的全部预设, 或拒绝原因.
 */
export function removePreset(
  applianceCode: string,
  presetId: string
): Promise<AirConditionerPresetsResult> {
  return updateDevicePresets(applianceCode, (presets) =>
    presets.some((preset) => preset.id === presetId)
      ? { ok: true, presets: presets.filter((preset) => preset.id !== presetId) }
      : { ok: false, error: 'notFound' }
  )
}

/**
 * 应用一套预设: 在预设设置上补上开机, 作为一次控制交给现有控制分派 (0x40 帧, B0 帧, 屏幕显示切换),
 * 声音随控制更新本地设置; 只读取预设, 不改动预设本身.
 * @param applianceCode 设备唯一标识.
 * @param presetId 预设唯一标识.
 * @returns 应用后的设置页状态.
 * @throws PresetFileUnreadableError 当预设文件无法读取或内容无效时.
 * @throws PresetNotFoundError 当预设不存在时.
 * @throws NotLoggedInError 当没有登录会话时.
 * @throws CloudSessionExpiredError 当令牌无法续期时.
 * @throws CloudRequestError 当云端失败 (如设备离线) 时; 网络错误原样抛出.
 */
export async function applyPreset(
  applianceCode: string,
  presetId: string
): Promise<AirConditionerStatus> {
  const listResult = await listDevicePresets(applianceCode)
  if (!listResult.ok) {
    throw new PresetFileUnreadableError()
  }
  const preset = listResult.presets.find(({ id }) => id === presetId)
  if (preset === undefined) {
    throw new PresetNotFoundError(presetId)
  }
  return controlAirConditioner(applianceCode, { ...preset.settings, isPoweredOn: true })
}
