import { randomBytes, randomUUID } from 'node:crypto'

/**
 * 模拟设备 id 的随机字节数, 转为 hex 后为 16 位.
 */
const DEVICE_ID_BYTE_LENGTH = 8

/**
 * 把数字补零到两位.
 * @param value 待补零的数字.
 * @returns 两位字符串.
 */
function padTwoDigits(value: number): string {
  return String(value).padStart(2, '0')
}

/**
 * 生成请求体中的 stamp / timestamp 字段, 格式为本机本地时间的 yyyyMMddHHmmss.
 * @param date 时间点.
 * @returns 14 位时间串.
 */
export function createStamp(date: Date): string {
  return [
    String(date.getFullYear()),
    padTwoDigits(date.getMonth() + 1),
    padTwoDigits(date.getDate()),
    padTwoDigits(date.getHours()),
    padTwoDigits(date.getMinutes()),
    padTwoDigits(date.getSeconds())
  ].join('')
}

/**
 * 生成请求体中的 reqId 字段: 去掉连字符的 32 位 uuid.
 * @returns 32 位小写 hex.
 */
export function createRequestId(): string {
  return randomUUID().replaceAll('-', '')
}

/**
 * 生成登录请求中模拟的 16 位设备 id.
 * @returns 16 位小写 hex.
 */
export function createDeviceId(): string {
  return randomBytes(DEVICE_ID_BYTE_LENGTH).toString('hex')
}
