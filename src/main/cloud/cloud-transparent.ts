import type { CloudSession } from './cloud-auth'
import { postToCloud, type CloudCredentials } from './cloud-client'
import {
  CLOUD_ALIASES,
  CLOUD_HOSTS,
  TRANSPARENT_IS_FULL,
  TRANSPARENT_TIMESTAMP
} from './cloud-constants'
import { decryptDeviceData, deriveDeviceDataKey, encryptDeviceData } from './cloud-crypto'
import { CloudRequestError } from './cloud-error'
import { isJsonRecord, readString } from './cloud-json'
import { createRequestId, createStamp } from './cloud-request-fields'

/**
 * 透传明文中字节之间的分隔符.
 */
const FRAME_BYTE_SEPARATOR = ','

/**
 * 一个字节的取值上限 (不含), 用于有符号与无符号表示之间的转换.
 */
const BYTE_RANGE = 0x100

/**
 * 有符号字节的最大正值.
 */
const SIGNED_BYTE_MAX = 0x7f

/**
 * 一个字节的掩码.
 */
const BYTE_MASK = 0xff

/**
 * 把帧字节编码为透传明文: 每个字节按有符号十进制书写, 以逗号连接.
 * @param frame 帧字节, 每个为 0 到 255.
 * @returns 透传明文.
 */
function encodeFrameText(frame: readonly number[]): string {
  return frame
    .map((byte) => String(byte > SIGNED_BYTE_MAX ? byte - BYTE_RANGE : byte))
    .join(FRAME_BYTE_SEPARATOR)
}

/**
 * 把透传明文解码为帧字节.
 * @param text 以逗号连接的十进制字节串 (可含负数).
 * @returns 帧字节, 每个为 0 到 255.
 * @throws CloudRequestError 当明文中有非整数项时.
 */
function decodeFrameText(text: string): readonly number[] {
  return text.split(FRAME_BYTE_SEPARATOR).map((item) => {
    const value = Number.parseInt(item.trim(), 10)
    if (Number.isNaN(value)) {
      throw new CloudRequestError('cloud: 透传回帧不是十进制字节串')
    }
    return value & BYTE_MASK
  })
}

/**
 * 构造透传请求体, 字段顺序与美居 App 一致.
 * @param applianceCode 设备唯一标识.
 * @param order 已加密的帧 (hex).
 * @returns 请求体.
 */
function buildTransparentBody(applianceCode: string, order: string): Record<string, unknown> {
  return {
    applianceCode,
    order,
    timestamp: TRANSPARENT_TIMESTAMP,
    isFull: TRANSPARENT_IS_FULL,
    reqId: createRequestId(),
    stamp: createStamp(new Date())
  }
}

/**
 * 经云端向设备透传一帧, 并取回设备的回帧. 帧在发出前加密, 回帧在收到后解密.
 * @param credentials 登录凭据.
 * @param session 登录会话, 提供推导数据密钥的 loginKey.
 * @param applianceCode 设备唯一标识.
 * @param frame 完整的透传帧字节.
 * @returns 设备回帧的字节; 云端受理但设备没有回帧时返回 undefined.
 * @throws CloudRequestError 当云端失败 (如设备离线) 或回帧无法解码时; 网络错误原样抛出.
 */
export async function sendTransparentFrame(
  credentials: CloudCredentials,
  session: CloudSession,
  applianceCode: string,
  frame: readonly number[]
): Promise<readonly number[] | undefined> {
  const dataKey = deriveDeviceDataKey(session.loginKey)
  const data = await postToCloud({
    host: CLOUD_HOSTS.PROD,
    alias: CLOUD_ALIASES.TRANSPARENT_SEND,
    body: buildTransparentBody(applianceCode, encryptDeviceData(encodeFrameText(frame), dataKey)),
    credentials
  })
  const reply = isJsonRecord(data) ? readString(data, 'reply') : undefined
  if (!reply) {
    return undefined
  }
  try {
    return decodeFrameText(decryptDeviceData(reply, dataKey))
  } catch (error) {
    if (error instanceof CloudRequestError) {
      throw error
    }
    throw new CloudRequestError(`cloud: 透传回帧解密失败: ${String(error)}`)
  }
}
