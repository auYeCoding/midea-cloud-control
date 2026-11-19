import { postToCloud, type CloudCredentials } from './cloud-client'
import {
  APP_ID,
  APP_KEY,
  APP_VERSION,
  AUTO_LOGIN_RULE,
  CLOUD_ALIASES,
  CLOUD_HOSTS,
  DEVICE_NAME,
  LOGIN_CLIENT_TYPE,
  LOGIN_PLATFORM,
  LOGOFF_TYPE_NORMAL,
  LOGOUT_AUTHORIZATION,
  OS_VERSION,
  SMS_CODE_TYPE_LOGIN,
  SMS_IMAGE_CODE_NONE,
  SMS_LOGIN_TYPE
} from './cloud-constants'
import { computeRegionSign, hashIamPassword, hashLoginPassword } from './cloud-crypto'
import { CloudRequestError, CloudSessionExpiredError } from './cloud-error'
import { isJsonRecord, readNumber, readRecord, readRecordArray, readString } from './cloud-json'
import { createRequestId, createStamp } from './cloud-request-fields'

/**
 * 账号密码登录所需的输入.
 */
export interface CloudPasswordLogin {
  /**
   * 美居账号.
   */
  readonly account: string
  /**
   * 明文密码.
   */
  readonly password: string
  /**
   * 模拟的 16 位设备 id, 会话内复用.
   */
  readonly deviceId: string
}

/**
 * 登录成功后由云端响应得到的会话, 包含请求与续期所需的全部字段; 与登录方式无关.
 */
export interface CloudSession {
  /**
   * 当前令牌原值.
   */
  readonly accessToken: string
  /**
   * 当前令牌的过期时刻, 毫秒时间戳; 续期响应未给出时为 undefined, 表示过期时刻未知, 只依赖被动续期.
   */
  readonly expired?: number
  /**
   * 区域编号, 与令牌一起算出 regionSign.
   */
  readonly region: number
  /**
   * 续期用的长期口令, 续期后不变.
   */
  readonly tokenPwd: string
  /**
   * 云端用户 id, 续期请求的 userId 头.
   */
  readonly iotUserId: string
  /**
   * 账号下全部家庭的 homegroupId, 已转为字符串.
   */
  readonly homegroupIds: readonly string[]
  /**
   * 登录响应 data.key 原值 (64 位 hex), 用于推导设备透传数据的 AES 密钥; 续期不返回, 沿用登录时的值.
   */
  readonly loginKey: string
}

/**
 * 续期接口返回的新令牌.
 */
export interface RenewedToken {
  /**
   * 新令牌原值.
   */
  readonly accessToken: string
  /**
   * 新令牌的过期时刻, 毫秒时间戳; 云端未返回时为 undefined.
   */
  readonly expired: number | undefined
}

/**
 * 由会话算出每个请求携带的凭据.
 * @param session 登录会话.
 * @returns 令牌与 regionSign.
 */
export function toCloudCredentials(session: CloudSession): CloudCredentials {
  return {
    accessToken: session.accessToken,
    regionSign: computeRegionSign(session.accessToken, session.region)
  }
}

/**
 * 预登录, 取一次性 loginId.
 * @param account 美居账号.
 * @returns loginId.
 * @throws CloudRequestError 当云端失败或响应缺少 loginId 时.
 */
async function requestLoginId(account: string): Promise<string> {
  const data = await postToCloud({
    host: CLOUD_HOSTS.ALI,
    alias: CLOUD_ALIASES.LOGIN_ID,
    body: { loginAccount: account, stamp: createStamp(new Date()), reqId: createRequestId() }
  })
  const loginId = isJsonRecord(data) ? readString(data, 'loginId') : undefined
  if (loginId === undefined) {
    throw new CloudRequestError('cloud: 预登录响应缺少 loginId')
  }
  return loginId
}

/**
 * 按资料构造登录请求的 data 段; 账号密码登录与短信验证码登录相同, 字段顺序与美居 App 一致.
 * @param deviceId 模拟设备 id.
 * @returns data 段.
 */
function buildLoginDeviceData(deviceId: string): Record<string, unknown> {
  return {
    appKey: APP_KEY,
    appVersion: APP_VERSION,
    deviceId,
    deviceName: DEVICE_NAME,
    osVersion: OS_VERSION,
    platform: LOGIN_PLATFORM
  }
}

/**
 * 按资料构造账号密码登录的请求体, 字段顺序与美居 App 一致.
 * @param login 登录输入.
 * @param loginId 预登录取得的 loginId.
 * @returns 登录请求体.
 */
function buildLoginBody(login: CloudPasswordLogin, loginId: string): Record<string, unknown> {
  const stamp = createStamp(new Date())
  return {
    iotData: {
      appVersion: APP_VERSION,
      clientType: LOGIN_CLIENT_TYPE,
      deviceId: login.deviceId,
      iampwd: hashIamPassword(login.password),
      iotAppId: APP_ID,
      loginAccount: login.account,
      password: hashLoginPassword(loginId, login.password),
      reqId: createRequestId(),
      stamp
    },
    data: buildLoginDeviceData(login.deviceId),
    stamp,
    timestamp: stamp,
    reqId: createRequestId()
  }
}

/**
 * 从登录响应的 data 中取出会话.
 * @param data 登录响应的 data 字段.
 * @returns 会话.
 * @throws CloudRequestError 当缺少令牌, 过期时刻, 区域编号, tokenPwd, iotUserId, key 或家庭时.
 */
function parseSession(data: unknown): CloudSession {
  const record = isJsonRecord(data) ? data : {}
  const mdata = readRecord(record, 'mdata') ?? {}
  const tokenPwdInfo = readRecord(mdata, 'tokenPwdInfo') ?? {}
  const accessToken = readString(mdata, 'accessToken')
  const expired = readNumber(mdata, 'expired')
  const tokenPwd = readString(tokenPwdInfo, 'tokenPwd')
  const region = readNumber(record, 'region')
  const iotUserId = readString(record, 'iotUserId')
  const loginKey = readString(record, 'key')
  if (!accessToken || expired === undefined || region === undefined) {
    throw new CloudRequestError('cloud: 登录响应缺少 accessToken, expired 或 region')
  }
  if (!tokenPwd || !iotUserId) {
    throw new CloudRequestError('cloud: 登录响应缺少 tokenPwd 或 iotUserId')
  }
  if (!loginKey) {
    throw new CloudRequestError('cloud: 登录响应缺少 key')
  }
  const homegroupIds = readRecordArray(record, 'regions')
    .map((entry) => readNumber(entry, 'homegroupId'))
    .filter((homegroupId): homegroupId is number => homegroupId !== undefined)
    .map(String)
  if (homegroupIds.length === 0) {
    throw new CloudRequestError('cloud: 登录响应缺少 regions[].homegroupId')
  }
  return { accessToken, expired, region, tokenPwd, iotUserId, homegroupIds, loginKey }
}

/**
 * 账号密码登录: 预登录取 loginId, 算出口令字段后登录.
 * @param login 登录输入.
 * @returns 登录得到的会话.
 * @throws CloudRequestError 当任一步云端失败时; 网络错误原样抛出.
 */
export async function loginWithPassword(login: CloudPasswordLogin): Promise<CloudSession> {
  const loginId = await requestLoginId(login.account)
  const data = await postToCloud({
    host: CLOUD_HOSTS.PROD,
    alias: CLOUD_ALIASES.LOGIN,
    body: buildLoginBody(login, loginId)
  })
  return parseSession(data)
}

/**
 * 发送短信验证码所需的输入.
 */
export interface CloudSmsCodeRequest {
  /**
   * 接收验证码的手机号.
   */
  readonly mobile: string
  /**
   * 模拟的 16 位设备 id, 须与随后登录时相同.
   */
  readonly deviceId: string
}

/**
 * 短信验证码登录所需的输入.
 */
export interface CloudSmsLogin {
  /**
   * 接收验证码的手机号.
   */
  readonly mobile: string
  /**
   * 收到的短信验证码.
   */
  readonly smsCode: string
  /**
   * 模拟的 16 位设备 id, 会话内复用.
   */
  readonly deviceId: string
}

/**
 * 按资料构造发送短信验证码的请求体, 字段顺序与美居 App 一致.
 * @param request 发送验证码的输入.
 * @returns 请求体.
 */
function buildSmsCodeBody(request: CloudSmsCodeRequest): Record<string, unknown> {
  const stamp = createStamp(new Date())
  return {
    iotData: {
      iotAppId: APP_ID,
      mobile: request.mobile,
      reqId: createRequestId(),
      stamp,
      type: SMS_CODE_TYPE_LOGIN
    },
    data: { deviceId: request.deviceId, imgCode: SMS_IMAGE_CODE_NONE },
    stamp,
    timestamp: stamp,
    reqId: createRequestId()
  }
}

/**
 * 请云端向手机号发送登录用短信验证码.
 * @param request 发送验证码的输入.
 * @throws CloudRequestError 当云端拒绝发送时; 网络错误原样抛出.
 */
export async function requestSmsCode(request: CloudSmsCodeRequest): Promise<void> {
  await postToCloud({
    host: CLOUD_HOSTS.ALI,
    alias: CLOUD_ALIASES.SMS_CODE,
    body: buildSmsCodeBody(request)
  })
}

/**
 * 按资料构造短信验证码登录的请求体, 字段顺序与美居 App 一致.
 * @param login 短信登录输入.
 * @returns 请求体.
 */
function buildSmsLoginBody(login: CloudSmsLogin): Record<string, unknown> {
  const stamp = createStamp(new Date())
  return {
    iotData: {
      appVersion: APP_VERSION,
      deviceId: login.deviceId,
      iotAppId: APP_ID,
      loginType: SMS_LOGIN_TYPE,
      mobile: login.mobile,
      reqId: createRequestId(),
      smsCode: login.smsCode,
      stamp
    },
    data: buildLoginDeviceData(login.deviceId),
    stamp,
    timestamp: stamp,
    reqId: createRequestId()
  }
}

/**
 * 短信验证码登录; 成功响应与账号密码登录结构一致.
 * @param login 短信登录输入.
 * @returns 登录得到的会话.
 * @throws CloudRequestError 当云端拒绝登录 (如验证码错误) 时; 网络错误原样抛出.
 */
export async function loginWithSmsCode(login: CloudSmsLogin): Promise<CloudSession> {
  const data = await postToCloud({
    host: CLOUD_HOSTS.PROD,
    alias: CLOUD_ALIASES.SMS_LOGIN,
    body: buildSmsLoginBody(login)
  })
  return parseSession(data)
}

/**
 * 续期所需的输入.
 */
export interface CloudTokenRenewal {
  /**
   * 登录时得到的长期口令.
   */
  readonly tokenPwd: string
  /**
   * 云端用户 id.
   */
  readonly iotUserId: string
  /**
   * 与登录时相同的模拟设备 id.
   */
  readonly deviceId: string
}

/**
 * 按资料构造续期请求体.
 * @param renewal 续期输入.
 * @returns 续期请求体.
 */
function buildAutoLoginBody(renewal: CloudTokenRenewal): Record<string, unknown> {
  const stamp = createStamp(new Date())
  return {
    data: {
      tokenPwd: renewal.tokenPwd,
      rule: AUTO_LOGIN_RULE,
      platform: LOGIN_PLATFORM,
      iotAppId: APP_ID,
      deviceId: renewal.deviceId
    },
    stamp,
    timestamp: stamp,
    reqId: createRequestId()
  }
}

/**
 * 发出续期请求, 把云端业务失败统一转换为会话失效.
 * @param renewal 续期输入.
 * @returns 续期响应的 data 字段.
 * @throws CloudSessionExpiredError 当续期接口返回非成功 code 时; HTTP 与网络错误原样抛出.
 */
async function requestAutoLogin(renewal: CloudTokenRenewal): Promise<unknown> {
  try {
    return await postToCloud({
      host: CLOUD_HOSTS.PROD,
      alias: CLOUD_ALIASES.AUTO_LOGIN,
      body: buildAutoLoginBody(renewal),
      extraHeaders: { userId: renewal.iotUserId }
    })
  } catch (error) {
    if (error instanceof CloudRequestError && error.code !== undefined) {
      throw new CloudSessionExpiredError(`cloud: 续期失败 code=${error.code}`, error.cloudMessage)
    }
    throw error
  }
}

/**
 * 用 tokenPwd 续期 accessToken; tokenPwd 不变, 调用方需用新令牌重算 regionSign.
 * @param renewal 续期输入.
 * @returns 新令牌与过期时刻.
 * @throws CloudSessionExpiredError 当续期接口返回非成功 code 或没有返回新令牌时; HTTP 与网络错误原样抛出.
 */
export async function renewAccessToken(renewal: CloudTokenRenewal): Promise<RenewedToken> {
  const data = await requestAutoLogin(renewal)
  const record = isJsonRecord(data) ? data : {}
  const accessToken = readString(record, 'accessToken')
  if (!accessToken) {
    throw new CloudSessionExpiredError('cloud: 续期响应缺少 accessToken')
  }
  return { accessToken, expired: readNumber(record, 'expired') }
}

/**
 * 按资料构造注销请求体; PC 客户端没有推送, 推送 info 传空数组.
 * @param deviceId 模拟设备 id.
 * @returns 注销请求体.
 */
function buildLogoutBody(deviceId: string): Record<string, unknown> {
  const stamp = createStamp(new Date())
  return {
    iotData: { reqId: createRequestId(), stamp },
    data: {
      logoffType: LOGOFF_TYPE_NORMAL,
      pushData: { deviceId, info: [], isBind: false }
    },
    stamp,
    timestamp: stamp,
    reqId: createRequestId()
  }
}

/**
 * 调用云端注销接口.
 * @param session 当前会话.
 * @param deviceId 模拟设备 id.
 * @throws CloudRequestError 当云端失败时; 网络错误原样抛出.
 */
export async function logoutFromCloud(session: CloudSession, deviceId: string): Promise<void> {
  await postToCloud({
    host: CLOUD_HOSTS.PROD,
    alias: CLOUD_ALIASES.LOGOUT,
    body: buildLogoutBody(deviceId),
    credentials: toCloudCredentials(session),
    extraHeaders: { Authorization: LOGOUT_AUTHORIZATION }
  })
}
