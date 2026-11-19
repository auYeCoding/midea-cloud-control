import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { app, safeStorage } from 'electron'

import type { CloudSession } from '../cloud/cloud-auth'
import { isJsonRecord, readNumber, readRecord, readString } from '../cloud/cloud-json'

/**
 * 加密会话文件的文件名, 位于用户数据目录.
 */
const SESSION_FILE_NAME = 'session.bin'

/**
 * 会话文件内容的结构版本; 结构变化时递增, 旧版本文件视为没有会话.
 */
const SESSION_FILE_VERSION = 2

/**
 * 会话文件解密后的结构.
 */
interface SessionFileContent {
  /**
   * 结构版本.
   */
  readonly version: typeof SESSION_FILE_VERSION
  /**
   * 登录会话.
   */
  readonly session: CloudSession
}

/**
 * 取会话文件的完整路径. 只能在应用就绪后调用.
 * @returns 文件路径.
 */
function getSessionFilePath(): string {
  return join(app.getPath('userData'), SESSION_FILE_NAME)
}

/**
 * 判断值是否为字符串数组.
 * @param value 待判断的值.
 * @returns 是字符串数组时返回 true.
 */
function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

/**
 * 校验解密后的内容是否为当前版本的会话结构.
 * @param value JSON 解析结果.
 * @returns 结构有效时返回 true.
 */
function isSessionFileContent(value: unknown): value is SessionFileContent {
  if (!isJsonRecord(value) || value.version !== SESSION_FILE_VERSION) {
    return false
  }
  const session = readRecord(value, 'session')
  return (
    session !== undefined &&
    readString(session, 'accessToken') !== undefined &&
    (session.expired === undefined || readNumber(session, 'expired') !== undefined) &&
    readNumber(session, 'region') !== undefined &&
    readString(session, 'tokenPwd') !== undefined &&
    readString(session, 'iotUserId') !== undefined &&
    isStringArray(session.homegroupIds) &&
    readString(session, 'loginKey') !== undefined
  )
}

/**
 * 判断错误是否表示文件不存在.
 * @param error 捕获到的错误.
 * @returns 是 ENOENT 时返回 true.
 */
function isFileNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}

/**
 * 读取并解密已保存的会话. 系统不支持加密, 文件不存在, 解密失败或结构无效时都视为没有会话.
 * 只能在应用就绪后调用.
 * @returns 已保存的会话; 没有时返回 undefined.
 */
export async function readStoredSession(): Promise<CloudSession | undefined> {
  if (!safeStorage.isEncryptionAvailable()) {
    return undefined
  }
  try {
    const content: unknown = JSON.parse(
      safeStorage.decryptString(await readFile(getSessionFilePath()))
    )
    return isSessionFileContent(content) ? content.session : undefined
  } catch (error) {
    if (!isFileNotFound(error)) {
      console.error('session: 读取已保存的会话失败', error)
    }
    return undefined
  }
}

/**
 * 加密后保存会话, 覆盖旧文件. 系统不支持加密时不落盘, 会话只保留在内存中.
 * 只能在应用就绪后调用.
 * @param session 登录会话.
 * @throws Error 当加密或写入失败时.
 */
export async function saveSession(session: CloudSession): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    return
  }
  const content: SessionFileContent = { version: SESSION_FILE_VERSION, session }
  await writeFile(getSessionFilePath(), safeStorage.encryptString(JSON.stringify(content)))
}

/**
 * 删除已保存的会话文件; 文件不存在时不报错. 只能在应用就绪后调用.
 * @throws Error 当删除失败时.
 */
export async function clearStoredSession(): Promise<void> {
  await rm(getSessionFilePath(), { force: true })
}
