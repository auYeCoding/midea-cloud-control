import type { PasswordCredentials, SmsCodeCredentials } from '../../shared/auth'
import type { CloudCredentials } from '../cloud/cloud-client'
import {
  loginWithPassword,
  loginWithSmsCode,
  logoutFromCloud,
  requestSmsCode,
  renewAccessToken,
  toCloudCredentials,
  type CloudSession
} from '../cloud/cloud-auth'
import { CloudSessionExpiredError, CloudTokenExpiredError } from '../cloud/cloud-error'
import { getDeviceId } from '../session/device-identity'
import { clearStoredSession, readStoredSession, saveSession } from '../session/session-store'

/**
 * 当前没有登录会话时抛出的错误.
 */
export class NotLoggedInError extends Error {
  /**
   * 创建未登录错误.
   */
  constructor() {
    super('auth: 当前没有登录会话')
    this.name = 'NotLoggedInError'
  }
}

/**
 * 需要登录会话的云端操作.
 */
export type SessionOperation<T> = (
  credentials: CloudCredentials,
  session: CloudSession
) => Promise<T>

/**
 * 当前登录会话, 主进程内唯一持有处; 启动后首次使用时从加密存储恢复.
 */
let currentSession: CloudSession | undefined

/**
 * 从加密存储恢复会话的过程, 本次启动内只执行一次.
 */
let restorePromise: Promise<void> | undefined

/**
 * 进行中的续期, 多个请求同时失效时共用同一次续期.
 */
let renewalPromise: Promise<CloudSession> | undefined

/**
 * 从加密存储读取会话作为当前会话; 读取期间若已经登录, 不覆盖新会话.
 */
async function restoreSession(): Promise<void> {
  const storedSession = await readStoredSession()
  currentSession ??= storedSession
}

/**
 * 首次使用时从加密存储恢复会话, 之后的调用复用同一次恢复.
 * @returns 恢复完成时兑现的 Promise.
 */
function ensureSessionRestored(): Promise<void> {
  restorePromise ??= restoreSession()
  return restorePromise
}

/**
 * 加密保存会话; 保存失败只记录日志, 内存中的会话照常使用.
 * @param session 登录会话.
 */
async function persistSession(session: CloudSession): Promise<void> {
  try {
    await saveSession(session)
  } catch (error) {
    console.error('auth: 保存会话失败', error)
  }
}

/**
 * 清除内存与加密存储中的会话; 删除文件失败只记录日志.
 */
async function discardSession(): Promise<void> {
  currentSession = undefined
  try {
    await clearStoredSession()
  } catch (error) {
    console.error('auth: 清除已保存的会话失败', error)
  }
}

/**
 * 以登录结果建立会话: 替换内存会话并加密保存. 各种登录方式成功后都经此处建立会话.
 * @param session 登录得到的会话.
 */
async function establishSession(session: CloudSession): Promise<void> {
  await ensureSessionRestored()
  currentSession = session
  await persistSession(session)
}

/**
 * 用 tokenPwd 续期一次, 成功后写回内存与加密存储; 续期期间会话被替换或清除时不写回.
 * @param session 发起续期时的会话.
 * @returns 续期后的会话.
 * @throws CloudSessionExpiredError 当续期失败时, 此时会话已被清除; HTTP 与网络错误原样抛出, 会话保留.
 */
async function performRenewal(session: CloudSession): Promise<CloudSession> {
  try {
    const renewed = await renewAccessToken({
      tokenPwd: session.tokenPwd,
      iotUserId: session.iotUserId,
      deviceId: await getDeviceId()
    })
    const renewedSession: CloudSession = {
      ...session,
      accessToken: renewed.accessToken,
      expired: renewed.expired
    }
    if (currentSession === session) {
      currentSession = renewedSession
      await persistSession(renewedSession)
    }
    return renewedSession
  } catch (error) {
    if (error instanceof CloudSessionExpiredError && currentSession === session) {
      await discardSession()
    }
    throw error
  }
}

/**
 * 续期用 staleAccessToken 发出而失效的会话. 令牌已被其它请求续期过时直接返回当前会话;
 * 续期进行中时等待并复用其结果, 保证同时失效的多个请求只续期一次.
 * @param staleAccessToken 失效请求所用的令牌.
 * @returns 可用于重试的会话.
 * @throws NotLoggedInError 当会话已被清除时.
 * @throws CloudSessionExpiredError 当续期失败时.
 */
function renewSession(staleAccessToken: string): Promise<CloudSession> {
  const session = currentSession
  if (session === undefined) {
    return Promise.reject(new NotLoggedInError())
  }
  if (session.accessToken !== staleAccessToken) {
    return Promise.resolve(session)
  }
  renewalPromise ??= performRenewal(session).finally(() => {
    renewalPromise = undefined
  })
  return renewalPromise
}

/**
 * 判断会话令牌是否已过本地记录的过期时刻; 过期时刻未知时返回 false, 交给被动续期处理.
 * @param session 登录会话.
 * @returns 已过期时返回 true.
 */
function isPastExpiry(session: CloudSession): boolean {
  return session.expired !== undefined && Date.now() >= session.expired
}

/**
 * 读取可用的会话: 令牌已过本地记录的过期时刻时先续期一次, 避免首个请求必然失效.
 * @returns 会话.
 * @throws NotLoggedInError 当没有登录会话时.
 * @throws CloudSessionExpiredError 当续期失败时.
 */
async function getUsableSession(): Promise<CloudSession> {
  await ensureSessionRestored()
  const session = currentSession
  if (session === undefined) {
    throw new NotLoggedInError()
  }
  return isPastExpiry(session) ? renewSession(session.accessToken) : session
}

/**
 * 用当前会话执行云端操作: 云端返回令牌失效码时续期并重试一次.
 * @param operation 需要登录会话的云端操作.
 * @returns 操作结果.
 * @throws NotLoggedInError 当没有登录会话时.
 * @throws CloudSessionExpiredError 当续期失败时, 此时会话已被清除.
 * @throws CloudRequestError 当云端失败时; 网络错误原样抛出.
 */
export async function runWithSession<T>(operation: SessionOperation<T>): Promise<T> {
  const session = await getUsableSession()
  try {
    return await operation(toCloudCredentials(session), session)
  } catch (error) {
    if (!(error instanceof CloudTokenExpiredError)) {
      throw error
    }
    const renewedSession = await renewSession(session.accessToken)
    return operation(toCloudCredentials(renewedSession), renewedSession)
  }
}

/**
 * 用账号密码登录, 成功后建立会话.
 * @param credentials 账号与明文密码; 明文密码只用于本次登录, 不保存.
 * @throws CloudRequestError 当云端拒绝登录时; 网络错误原样抛出.
 */
export async function loginWithPasswordCredentials(
  credentials: PasswordCredentials
): Promise<void> {
  const session = await loginWithPassword({
    account: credentials.account,
    password: credentials.password,
    deviceId: await getDeviceId()
  })
  await establishSession(session)
}

/**
 * 请云端向手机号发送登录用短信验证码, 携带与登录时相同的设备 id.
 * @param mobile 接收验证码的手机号.
 * @throws CloudRequestError 当云端拒绝发送时; 网络错误原样抛出.
 */
export async function sendSmsCode(mobile: string): Promise<void> {
  await requestSmsCode({ mobile, deviceId: await getDeviceId() })
}

/**
 * 用手机号与短信验证码登录, 成功后建立会话.
 * @param credentials 手机号与验证码.
 * @throws CloudRequestError 当云端拒绝登录 (如验证码错误) 时; 网络错误原样抛出.
 */
export async function loginWithSmsCodeCredentials(credentials: SmsCodeCredentials): Promise<void> {
  const session = await loginWithSmsCode({
    mobile: credentials.mobile,
    smsCode: credentials.smsCode,
    deviceId: await getDeviceId()
  })
  await establishSession(session)
}

/**
 * 查询是否有登录会话, 首次调用时从加密存储恢复.
 * @returns 有会话时返回 true.
 */
export async function hasSession(): Promise<boolean> {
  await ensureSessionRestored()
  return currentSession !== undefined
}

/**
 * 退出登录: 尽力调用云端注销接口, 无论结果如何都清除内存与加密存储中的会话.
 */
export async function logout(): Promise<void> {
  await ensureSessionRestored()
  const session = currentSession
  try {
    if (session !== undefined) {
      await logoutFromCloud(session, await getDeviceId())
    }
  } catch (error) {
    console.error('auth: 云端注销失败, 仍清除本地会话', error)
  } finally {
    await discardSession()
  }
}
