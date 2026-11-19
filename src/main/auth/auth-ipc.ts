import { ipcMain } from 'electron'

import {
  AUTH_CHANNELS,
  type LoginResult,
  type PasswordCredentials,
  type SendSmsCodeResult,
  type SmsCodeCredentials
} from '../../shared/auth'
import { toCloudFailure } from '../cloud/cloud-failure'
import {
  hasSession,
  loginWithPasswordCredentials,
  loginWithSmsCodeCredentials,
  logout,
  sendSmsCode
} from './auth-service'

/**
 * 执行一次登录相关的云端操作, 把异常转换为失败结果, 避免错误跨进程时丢失可读原因.
 * @param operation 云端操作.
 * @returns 成功结果, 或带云端原因的失败结果.
 */
async function runAuthOperation(operation: () => Promise<void>): Promise<LoginResult> {
  try {
    await operation()
    return { ok: true }
  } catch (error) {
    return toCloudFailure('auth', error)
  }
}

/**
 * 处理账号密码登录请求.
 * @param credentials 渲染进程提交的账号与密码.
 * @returns 登录结果.
 */
function handleLoginWithPassword(credentials: PasswordCredentials): Promise<LoginResult> {
  return runAuthOperation(() => loginWithPasswordCredentials(credentials))
}

/**
 * 处理发送短信验证码请求.
 * @param mobile 渲染进程提交的手机号.
 * @returns 发送结果.
 */
function handleSendSmsCode(mobile: string): Promise<SendSmsCodeResult> {
  return runAuthOperation(() => sendSmsCode(mobile))
}

/**
 * 处理短信验证码登录请求.
 * @param credentials 渲染进程提交的手机号与验证码.
 * @returns 登录结果.
 */
function handleLoginWithSmsCode(credentials: SmsCodeCredentials): Promise<LoginResult> {
  return runAuthOperation(() => loginWithSmsCodeCredentials(credentials))
}

/**
 * 注册登录相关的 IPC 处理器, 应用生命周期内只调用一次.
 */
export function registerAuthHandlers(): void {
  ipcMain.handle(AUTH_CHANNELS.LOGIN_WITH_PASSWORD, (_event, credentials: PasswordCredentials) =>
    handleLoginWithPassword(credentials)
  )
  ipcMain.handle(AUTH_CHANNELS.SEND_SMS_CODE, (_event, mobile: string) => handleSendSmsCode(mobile))
  ipcMain.handle(AUTH_CHANNELS.LOGIN_WITH_SMS_CODE, (_event, credentials: SmsCodeCredentials) =>
    handleLoginWithSmsCode(credentials)
  )
  ipcMain.handle(AUTH_CHANNELS.IS_LOGGED_IN, () => hasSession())
  ipcMain.handle(AUTH_CHANNELS.LOGOUT, () => logout())
}
