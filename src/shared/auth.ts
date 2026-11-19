/**
 * 登录相关的 IPC 通道名, 主进程与 preload 共用的唯一定义.
 */
export const AUTH_CHANNELS = {
  LOGIN_WITH_PASSWORD: 'auth:login-with-password',
  SEND_SMS_CODE: 'auth:send-sms-code',
  LOGIN_WITH_SMS_CODE: 'auth:login-with-sms-code',
  IS_LOGGED_IN: 'auth:is-logged-in',
  LOGOUT: 'auth:logout'
} as const

/**
 * 账号密码登录的输入.
 */
export interface PasswordCredentials {
  /**
   * 美居账号 (手机号或账号名).
   */
  readonly account: string
  /**
   * 明文密码, 只在主进程内参与哈希, 不落盘.
   */
  readonly password: string
}

/**
 * 短信验证码登录的输入.
 */
export interface SmsCodeCredentials {
  /**
   * 接收验证码的手机号.
   */
  readonly mobile: string
  /**
   * 收到的短信验证码.
   */
  readonly smsCode: string
}

/**
 * 跨进程调用的失败结果. 云端给出原因时带上原因, 否则由渲染进程显示通用失败文案.
 */
export interface CloudFailure {
  /**
   * 失败标记.
   */
  readonly ok: false
  /**
   * 云端返回的错误描述; 网络失败或云端未给出原因时为 undefined.
   */
  readonly cloudMessage?: string
  /**
   * 登录会话已失效且无法续期, 已在主进程清除, 渲染进程应回到登录页; 此时 cloudMessage 为续期接口的描述.
   */
  readonly isSessionExpired?: boolean
}

/**
 * 登录结果; 成功时不携带任何令牌或密钥, 会话只保存在主进程.
 */
export type LoginResult = { readonly ok: true } | CloudFailure

/**
 * 发送短信验证码的结果; 成功表示云端已受理发送.
 */
export type SendSmsCodeResult = { readonly ok: true } | CloudFailure

/**
 * preload 暴露给渲染进程的登录能力.
 */
export interface AuthApi {
  /**
   * 用账号与密码登录美居云.
   */
  readonly loginWithPassword: (credentials: PasswordCredentials) => Promise<LoginResult>
  /**
   * 请云端向手机号发送登录用短信验证码.
   */
  readonly sendSmsCode: (mobile: string) => Promise<SendSmsCodeResult>
  /**
   * 用手机号与短信验证码登录美居云.
   */
  readonly loginWithSmsCode: (credentials: SmsCodeCredentials) => Promise<LoginResult>
  /**
   * 查询主进程中是否已有登录会话.
   */
  readonly isLoggedIn: () => Promise<boolean>
  /**
   * 退出登录: 主进程尽力调用云端注销, 无论结果如何都清除已保存的会话.
   */
  readonly logout: () => Promise<void>
}
