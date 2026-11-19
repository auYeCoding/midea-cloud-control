import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { app } from 'electron'

import {
  AIR_CONDITIONER_MODES,
  FAN_SPEED_AUTO,
  HORIZONTAL_AIRFLOW_DIRECTIONS,
  VERTICAL_AIRFLOW_DIRECTIONS
} from '../../shared/air-conditioner'
import {
  PRESET_SETTING_FIELDS,
  type AirConditionerPreset,
  type AirConditionerPresetSettings,
  type AirConditionerPresetsResult,
  type PresetSettingField
} from '../../shared/air-conditioner-presets'

/**
 * 保存各台空调预设的文件名, 位于用户数据目录. 内容为 applianceCode 到预设数组的 JSON 对象, 明文保存.
 */
const PRESET_FILE_NAME = 'ac-presets.json'

/**
 * 各台空调的预设; 键为 applianceCode.
 */
type PresetFile = Readonly<Record<string, readonly AirConditionerPreset[]>>

/**
 * 一台空调的预设变更: 输入该空调当前的预设, 返回成功结果 (带变更后的全部预设) 或拒绝原因.
 */
export type PresetTransform = (
  presets: readonly AirConditionerPreset[]
) => AirConditionerPresetsResult

/**
 * 判断一个值是否为字符串字面量数组中的一项.
 * @param values 允许的取值.
 * @param value 待判断的值.
 * @returns 在允许的取值之内时返回 true.
 */
function isOneOf(values: readonly string[], value: unknown): boolean {
  return typeof value === 'string' && values.includes(value)
}

/**
 * 判断一个值是否为布尔值.
 * @param value 待判断的值.
 * @returns 是布尔值时返回 true.
 */
function isBoolean(value: unknown): boolean {
  return typeof value === 'boolean'
}

/**
 * 判断一个值是否为有限数字.
 * @param value 待判断的值.
 * @returns 是有限数字时返回 true.
 */
function isFiniteNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * 各设置字段在预设文件中的取值校验, 防止被改坏的文件把无效取值带进控制帧.
 */
const SETTING_VALIDATORS: Readonly<Record<PresetSettingField, (value: unknown) => boolean>> = {
  targetTemperature: isFiniteNumber,
  mode: (value) => isOneOf(AIR_CONDITIONER_MODES, value),
  fanSpeed: (value) => value === FAN_SPEED_AUTO || isFiniteNumber(value),
  isSwingUpDown: isBoolean,
  isSwingLeftRight: isBoolean,
  isPreventStraightWind: isBoolean,
  verticalAirflowDirection: (value) => isOneOf(VERTICAL_AIRFLOW_DIRECTIONS, value),
  horizontalAirflowDirection: (value) => isOneOf(HORIZONTAL_AIRFLOW_DIRECTIONS, value),
  isEco: isBoolean,
  isElectricHeating: isBoolean,
  isComfortPowerSave: isBoolean,
  isIntelligentControl: isBoolean,
  isScreenDisplayOn: isBoolean,
  isSoundOn: isBoolean,
  isAntiMildew: isBoolean,
  isLightSensitive: isBoolean
}

/**
 * 判断一个值是否为普通对象 (非 null, 非数组).
 * @param value 待判断的值.
 * @returns 是普通对象时返回 true.
 */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * 判断一个字段名是否为预设设置字段.
 * @param field 字段名.
 * @returns 是预设设置字段时返回 true.
 */
function isPresetSettingField(field: string): field is PresetSettingField {
  return (PRESET_SETTING_FIELDS as readonly string[]).includes(field)
}

/**
 * 判断解析出的 JSON 是否为有效的预设设置: 只含预设设置字段, 且每个字段取值有效.
 * @param value 解析出的 JSON.
 * @returns 格式有效时返回 true.
 */
function isPresetSettings(value: unknown): value is AirConditionerPresetSettings {
  return (
    isRecord(value) &&
    Object.entries(value).every(
      ([field, entry]) => isPresetSettingField(field) && SETTING_VALIDATORS[field](entry)
    )
  )
}

/**
 * 判断解析出的 JSON 是否为有效的一套预设.
 * @param value 解析出的 JSON.
 * @returns 格式有效时返回 true.
 */
function isPreset(value: unknown): value is AirConditionerPreset {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isFiniteNumber(value.updatedAt) &&
    isPresetSettings(value.settings)
  )
}

/**
 * 判断解析出的 JSON 是否整体为有效的预设文件: 每个空调条目都是数组, 每套预设都有效.
 * 任一处无效即视为整份文件无效, 不丢弃局部内容, 避免之后的写入删掉无法识别的预设.
 * @param value 解析出的 JSON.
 * @returns 格式有效时返回 true.
 */
function isPresetFile(value: unknown): value is PresetFile {
  return (
    isRecord(value) &&
    Object.values(value).every((presets) => Array.isArray(presets) && presets.every(isPreset))
  )
}

/**
 * 判断读文件的错误是否为文件不存在.
 * @param error 读文件抛出的错误.
 * @returns 文件不存在时返回 true.
 */
function isFileNotFoundError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}

/**
 * 本次启动内已确认写入 (或成功读取到) 的预设文件内容, 保证成功读取后不再读文件;
 * 读取失败时不缓存, 下次访问重新读取 (用户修复或移走文件后即可恢复).
 */
let presetFilePromise: Promise<PresetFile> | undefined

/**
 * 进行中的预设变更链, 保证变更依次基于前一次的结果执行, 不丢失更新.
 */
let mutationChain: Promise<unknown> = Promise.resolve()

/**
 * 取预设文件的完整路径. 只能在应用就绪后调用.
 * @returns 文件路径.
 */
function getPresetFilePath(): string {
  return join(app.getPath('userData'), PRESET_FILE_NAME)
}

/**
 * 读取已保存的预设文件; 只有文件不存在时视为没有预设.
 * @returns 预设文件内容; 文件不存在时为空对象; 读取失败, 不是合法 JSON 或内容无效时返回 undefined.
 */
async function readStoredPresetFile(): Promise<PresetFile | undefined> {
  let text: string
  try {
    text = await readFile(getPresetFilePath(), 'utf8')
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return {}
    }
    console.error('air-conditioner-presets: 读取预设文件失败', error)
    return undefined
  }
  try {
    const parsed: unknown = JSON.parse(text)
    if (isPresetFile(parsed)) {
      return parsed
    }
  } catch (error) {
    console.error('air-conditioner-presets: 预设文件不是合法 JSON', error)
    return undefined
  }
  console.error('air-conditioner-presets: 预设文件内容无效')
  return undefined
}

/**
 * 取本次启动内的预设文件内容, 尚未成功读取时读取文件.
 * @returns 预设文件内容; 文件无法读取或内容无效时返回 undefined.
 */
async function loadPresetFile(): Promise<PresetFile | undefined> {
  if (presetFilePromise !== undefined) {
    return presetFilePromise
  }
  const file = await readStoredPresetFile()
  if (file !== undefined) {
    presetFilePromise ??= Promise.resolve(file)
  }
  return file
}

/**
 * 对一台空调的预设执行一次变更: 预设文件无法读取或内容无效时拒绝, 原文件不动;
 * 变更成功时写入文件, 写入成功后才在本次启动内生效.
 * @param applianceCode 设备唯一标识.
 * @param transform 变更.
 * @returns 变更结果; 预设文件无法读取时为 fileUnreadable, 写入文件失败时为 storageFailed.
 */
async function runUpdate(
  applianceCode: string,
  transform: PresetTransform
): Promise<AirConditionerPresetsResult> {
  const file = await loadPresetFile()
  if (file === undefined) {
    return { ok: false, error: 'fileUnreadable' }
  }
  const result = transform(file[applianceCode] ?? [])
  if (!result.ok) {
    return result
  }
  const nextFile: PresetFile = { ...file, [applianceCode]: result.presets }
  try {
    await writeFile(getPresetFilePath(), JSON.stringify(nextFile), 'utf8')
  } catch (error) {
    console.error('air-conditioner-presets: 保存预设失败', error)
    return { ok: false, error: 'storageFailed' }
  }
  presetFilePromise = Promise.resolve(nextFile)
  return result
}

/**
 * 取一台空调的全部预设; 不同空调的预设按设备唯一标识分别存放, 互不影响.
 * @param applianceCode 设备唯一标识.
 * @returns 成功时带预设 (按保存顺序排列, 没有时为空数组); 预设文件无法读取或内容无效时为 fileUnreadable.
 */
export async function listDevicePresets(
  applianceCode: string
): Promise<AirConditionerPresetsResult> {
  const file = await loadPresetFile()
  return file === undefined
    ? { ok: false, error: 'fileUnreadable' }
    : { ok: true, presets: file[applianceCode] ?? [] }
}

/**
 * 把一次变更排到变更链末尾执行, 只改动该空调的预设.
 * @param applianceCode 设备唯一标识.
 * @param transform 变更.
 * @returns 变更结果; 预设文件无法读取时为 fileUnreadable, 写入文件失败时为 storageFailed.
 */
export function updateDevicePresets(
  applianceCode: string,
  transform: PresetTransform
): Promise<AirConditionerPresetsResult> {
  const update = mutationChain.then(() => runUpdate(applianceCode, transform))
  mutationChain = update.catch(() => undefined)
  return update
}
