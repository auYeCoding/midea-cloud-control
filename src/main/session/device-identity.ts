import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { app } from 'electron'

import { createDeviceId } from '../cloud/cloud-request-fields'

/**
 * 保存模拟设备 id 的文件名, 位于用户数据目录. 设备 id 不是密钥, 明文保存; 退出登录时保留.
 */
const DEVICE_ID_FILE_NAME = 'device-id'

/**
 * 有效设备 id 的格式: 16 位小写 hex.
 */
const DEVICE_ID_PATTERN = /^[0-9a-f]{16}$/

/**
 * 本次启动内读取或生成设备 id 的结果, 保证只读写一次文件.
 */
let deviceIdPromise: Promise<string> | undefined

/**
 * 取设备 id 文件的完整路径. 只能在应用就绪后调用.
 * @returns 文件路径.
 */
function getDeviceIdFilePath(): string {
  return join(app.getPath('userData'), DEVICE_ID_FILE_NAME)
}

/**
 * 读取已保存的设备 id.
 * @returns 有效的设备 id; 文件不存在或内容无效时返回 undefined.
 */
async function readStoredDeviceId(): Promise<string | undefined> {
  try {
    const storedId = (await readFile(getDeviceIdFilePath(), 'utf8')).trim()
    return DEVICE_ID_PATTERN.test(storedId) ? storedId : undefined
  } catch {
    return undefined
  }
}

/**
 * 读取已保存的设备 id; 没有时生成新的并保存. 保存失败只记录日志, 本次启动内仍复用生成的 id.
 * @returns 设备 id.
 */
async function loadOrCreateDeviceId(): Promise<string> {
  const storedId = await readStoredDeviceId()
  if (storedId !== undefined) {
    return storedId
  }
  const createdId = createDeviceId()
  try {
    await writeFile(getDeviceIdFilePath(), createdId, 'utf8')
  } catch (error) {
    console.error('session: 保存设备 id 失败', error)
  }
  return createdId
}

/**
 * 取登录与续期使用的模拟设备 id: 首次生成后持久保存, 之后复用. 只能在应用就绪后调用.
 * @returns 16 位设备 id.
 */
export function getDeviceId(): Promise<string> {
  deviceIdPromise ??= loadOrCreateDeviceId()
  return deviceIdPromise
}
