import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { app } from 'electron'

/**
 * 保存各台空调声音设置的文件名, 位于用户数据目录. 内容为 applianceCode 到是否鸣响的 JSON 对象, 明文保存.
 */
const SOUND_SETTINGS_FILE_NAME = 'ac-sound-settings.json'

/**
 * 没有保存过设置的空调的声音设置: 开启, 与美居 App 的默认值一致.
 */
const DEFAULT_SOUND_ENABLED = true

/**
 * 各台空调的声音设置; 键为 applianceCode.
 */
type SoundSettings = Readonly<Record<string, boolean>>

/**
 * 本次启动内读取到的声音设置, 保证只读一次文件; 之后的修改直接更新它.
 */
let settingsPromise: Promise<SoundSettings> | undefined

/**
 * 取声音设置文件的完整路径. 只能在应用就绪后调用.
 * @returns 文件路径.
 */
function getSoundSettingsFilePath(): string {
  return join(app.getPath('userData'), SOUND_SETTINGS_FILE_NAME)
}

/**
 * 判断解析出的 JSON 是否为 applianceCode 到布尔值的对象.
 * @param value 解析出的 JSON.
 * @returns 格式有效时返回 true.
 */
function isSoundSettings(value: unknown): value is SoundSettings {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((entry) => typeof entry === 'boolean')
  )
}

/**
 * 读取已保存的声音设置.
 * @returns 声音设置; 文件不存在或内容无效时为空对象.
 */
async function readStoredSettings(): Promise<SoundSettings> {
  try {
    const parsed: unknown = JSON.parse(await readFile(getSoundSettingsFilePath(), 'utf8'))
    return isSoundSettings(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

/**
 * 取本次启动内的声音设置, 首次调用时读取文件.
 * @returns 声音设置.
 */
function loadSettings(): Promise<SoundSettings> {
  settingsPromise ??= readStoredSettings()
  return settingsPromise
}

/**
 * 取一台空调的声音设置: 本应用的本地设置, 不从空调回读; 没有保存过时为开启.
 * @param applianceCode 设备唯一标识.
 * @returns 声音开启时返回 true.
 */
export async function isSoundEnabled(applianceCode: string): Promise<boolean> {
  return (await loadSettings())[applianceCode] ?? DEFAULT_SOUND_ENABLED
}

/**
 * 保存一台空调的声音设置; 本次启动内立即生效, 写文件失败只记录日志.
 * @param applianceCode 设备唯一标识.
 * @param isEnabled 声音是否开启.
 */
export async function setSoundEnabled(applianceCode: string, isEnabled: boolean): Promise<void> {
  settingsPromise = loadSettings().then((current) => ({ ...current, [applianceCode]: isEnabled }))
  const settings = await settingsPromise
  try {
    await writeFile(getSoundSettingsFilePath(), JSON.stringify(settings), 'utf8')
  } catch (error) {
    console.error('air-conditioner: 保存声音设置失败', error)
  }
}
