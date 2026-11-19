import { ipcRenderer } from 'electron'

import { AUTH_CHANNELS, type AuthApi } from '../shared/auth'

/**
 * 基于 IPC 的登录实现, 由 preload 暴露给渲染进程; 只转发调用, 不含任何令牌或签名逻辑.
 */
export const auth: AuthApi = {
  loginWithPassword: (credentials) =>
    ipcRenderer.invoke(AUTH_CHANNELS.LOGIN_WITH_PASSWORD, credentials),
  sendSmsCode: (mobile) => ipcRenderer.invoke(AUTH_CHANNELS.SEND_SMS_CODE, mobile),
  loginWithSmsCode: (credentials) =>
    ipcRenderer.invoke(AUTH_CHANNELS.LOGIN_WITH_SMS_CODE, credentials),
  isLoggedIn: () => ipcRenderer.invoke(AUTH_CHANNELS.IS_LOGGED_IN),
  logout: () => ipcRenderer.invoke(AUTH_CHANNELS.LOGOUT)
}
