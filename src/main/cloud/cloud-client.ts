import {
  CLOUD_PROXY_PATH,
  CLOUD_SUCCESS_CODE,
  COMMON_HEADERS,
  TOKEN_EXPIRED_CODES,
  type CloudAlias,
  type CloudHost
} from './cloud-constants'
import { computeRequestSign } from './cloud-crypto'
import { CloudRequestError, CloudTokenExpiredError } from './cloud-error'
import { isJsonRecord, readNumber, readString, type JsonRecord } from './cloud-json'

/**
 * 登录后每个请求都要携带的凭据.
 */
export interface CloudCredentials {
  /**
   * 登录响应中的令牌原值.
   */
  readonly accessToken: string
  /**
   * 由令牌与区域编号算出的 regionSign.
   */
  readonly regionSign: string
}

/**
 * 一次云端请求的描述.
 */
export interface CloudRequest {
  /**
   * 线路域名.
   */
  readonly host: CloudHost
  /**
   * 真实接口别名.
   */
  readonly alias: CloudAlias
  /**
   * 请求体对象, 字段顺序即发出的顺序.
   */
  readonly body: Readonly<Record<string, unknown>>
  /**
   * 登录后的凭据; 登录前的请求不传.
   */
  readonly credentials?: CloudCredentials
  /**
   * 个别接口专属的附加请求头, 如续期的 userId 与注销的 Authorization.
   */
  readonly extraHeaders?: Readonly<Record<string, string>>
}

/**
 * 拼出统一包装接口的完整地址.
 * @param host 线路域名.
 * @param alias 真实接口别名.
 * @returns 请求地址.
 */
function buildProxyUrl(host: CloudHost, alias: CloudAlias): string {
  return `https://${host}${CLOUD_PROXY_PATH}?alias=${alias}`
}

/**
 * 组装请求头: 公共头, 签名与时间戳, 登录后的凭据头, 以及接口专属的附加头.
 * @param body 实际发出的请求体字符串.
 * @param request 请求描述.
 * @returns 请求头.
 */
function buildHeaders(body: string, request: CloudRequest): Record<string, string> {
  const random = String(Date.now())
  const headers: Record<string, string> = {
    ...COMMON_HEADERS,
    ...request.extraHeaders,
    sign: computeRequestSign(body, random),
    random
  }
  if (request.credentials !== undefined) {
    headers.accessToken = request.credentials.accessToken
    headers.regionSign = request.credentials.regionSign
  }
  return headers
}

/**
 * 读取响应中的 code 并统一转为字符串, 兼容云端以数值或字符串返回.
 * @param payload 已解析的响应 JSON.
 * @returns code 字符串; 缺少或类型不符时返回 undefined.
 */
function readCode(payload: JsonRecord): string | undefined {
  const numericCode = readNumber(payload, 'code')
  return numericCode === undefined ? readString(payload, 'code') : String(numericCode)
}

/**
 * 解析云端统一响应结构 {code, msg, data}, 成功时返回 data.
 * @param alias 接口别名, 用于错误描述.
 * @param payload 已解析的响应 JSON.
 * @returns 响应中的 data 字段.
 * @throws CloudTokenExpiredError 当 code 属于令牌失效码时.
 * @throws CloudRequestError 当结构不符或 code 不为成功值时.
 */
function unwrapEnvelope(alias: CloudAlias, payload: unknown): unknown {
  if (!isJsonRecord(payload)) {
    throw new CloudRequestError(`cloud: ${alias} 响应不是 JSON 对象`)
  }
  const code = readCode(payload)
  if (code === String(CLOUD_SUCCESS_CODE)) {
    return payload.data
  }
  const cloudMessage = readString(payload, 'msg') || undefined
  const message = `cloud: ${alias} 返回 code=${String(code)}`
  if (code !== undefined && TOKEN_EXPIRED_CODES.has(code)) {
    throw new CloudTokenExpiredError(message, cloudMessage, code)
  }
  throw new CloudRequestError(message, cloudMessage, code)
}

/**
 * 向美居云发出一次签名请求并返回响应中的 data.
 * @param request 请求描述.
 * @returns 响应中的 data 字段, 结构由调用方收窄.
 * @throws CloudRequestError 当 HTTP 状态非成功或云端返回失败时; 网络错误按 fetch 原样抛出.
 */
export async function postToCloud(request: CloudRequest): Promise<unknown> {
  const body = JSON.stringify(request.body)
  const response = await fetch(buildProxyUrl(request.host, request.alias), {
    method: 'POST',
    headers: buildHeaders(body, request),
    body
  })
  if (!response.ok) {
    throw new CloudRequestError(`cloud: ${request.alias} HTTP 状态 ${String(response.status)}`)
  }
  return unwrapEnvelope(request.alias, await response.json())
}
