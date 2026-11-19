import { createCipheriv, createDecipheriv, createHash, createHmac } from 'node:crypto'

import { LOGIN_KEY_DECRYPT_KEY, PASSWORD_SALT, SIGN_KEY, SIGN_PREFIX } from './cloud-constants'

/**
 * 设备透传数据所用的对称加密算法 (PKCS7 填充, 无 IV).
 */
const DEVICE_DATA_CIPHER = 'aes-128-ecb'

/**
 * AES-128-ECB 加密.
 * @param plain 明文字节.
 * @param key 16 字节密钥.
 * @returns 密文字节.
 */
function encryptAesEcb(plain: Buffer, key: Buffer): Buffer {
  const cipher = createCipheriv(DEVICE_DATA_CIPHER, key, null)
  return Buffer.concat([cipher.update(plain), cipher.final()])
}

/**
 * AES-128-ECB 解密.
 * @param encrypted 密文字节.
 * @param key 16 字节密钥.
 * @returns 明文字节.
 * @throws Error 当密文长度或填充无效时.
 */
function decryptAesEcb(encrypted: Buffer, key: Buffer): Buffer {
  const decipher = createDecipheriv(DEVICE_DATA_CIPHER, key, null)
  return Buffer.concat([decipher.update(encrypted), decipher.final()])
}

/**
 * 由登录响应 data.key 推导设备透传数据的密钥: 用固定密钥解密后得到 16 位 ASCII 串, 其字节即密钥.
 * @param loginKey 登录响应 data.key 原值 (hex).
 * @returns 16 字节密钥.
 * @throws Error 当 loginKey 无法解密时.
 */
export function deriveDeviceDataKey(loginKey: string): Buffer {
  return decryptAesEcb(Buffer.from(loginKey, 'hex'), Buffer.from(LOGIN_KEY_DECRYPT_KEY, 'ascii'))
}

/**
 * 加密透传数据: 明文按 ASCII 编码后 AES 加密, 输出 hex.
 * @param plainText 明文.
 * @param dataKey 设备透传数据的密钥.
 * @returns 小写 hex 密文.
 */
export function encryptDeviceData(plainText: string, dataKey: Buffer): string {
  return encryptAesEcb(Buffer.from(plainText, 'ascii'), dataKey).toString('hex')
}

/**
 * 解密透传数据: hex 密文 AES 解密后按 ASCII 解码.
 * @param encryptedHex hex 密文.
 * @param dataKey 设备透传数据的密钥.
 * @returns 明文.
 * @throws Error 当密文无效时.
 */
export function decryptDeviceData(encryptedHex: string, dataKey: Buffer): string {
  return decryptAesEcb(Buffer.from(encryptedHex, 'hex'), dataKey).toString('ascii')
}

/**
 * 计算字符串的小写 hex 摘要.
 * @param algorithm 摘要算法名.
 * @param value 输入字符串, 按 UTF-8 编码.
 * @returns 小写 hex 摘要.
 */
function digestHex(algorithm: 'md5' | 'sha256', value: string): string {
  return createHash(algorithm).update(value, 'utf8').digest('hex')
}

/**
 * 计算请求签名.
 * @param body 实际发出的请求体字符串.
 * @param random 与 random 请求头同值的 13 位毫秒时间戳.
 * @returns 小写 hex 签名.
 */
export function computeRequestSign(body: string, random: string): string {
  return createHmac('sha256', SIGN_KEY)
    .update(`${SIGN_PREFIX}${body}${random}`, 'utf8')
    .digest('hex')
}

/**
 * 计算登录后每个请求携带的 regionSign 请求头.
 * @param accessToken 登录响应中的令牌原值.
 * @param region 登录响应中的区域编号.
 * @returns 32 位大写 hex.
 */
export function computeRegionSign(accessToken: string, region: number): string {
  return digestHex('md5', `${accessToken}${String(region)}`).toUpperCase()
}

/**
 * 计算登录请求中的 password 字段.
 * @param loginId 预登录取得的一次性 loginId.
 * @param plainPassword 明文密码.
 * @returns 小写 hex.
 */
export function hashLoginPassword(loginId: string, plainPassword: string): string {
  return digestHex('sha256', `${loginId}${digestHex('sha256', plainPassword)}${PASSWORD_SALT}`)
}

/**
 * 计算登录请求中的 iampwd 字段 (对明文做两次 MD5).
 * @param plainPassword 明文密码.
 * @returns 小写 hex.
 */
export function hashIamPassword(plainPassword: string): string {
  return digestHex('md5', digestHex('md5', plainPassword))
}
