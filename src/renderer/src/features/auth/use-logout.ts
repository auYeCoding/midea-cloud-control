import { useState } from 'react'

import { authClient } from './auth-client'

/**
 * 退出登录的进行状态与操作.
 */
export interface LogoutState {
  /**
   * 是否正在退出登录.
   */
  readonly isLoggingOut: boolean
  /**
   * 退出登录; 正在进行时忽略重复调用.
   */
  readonly logout: () => Promise<void>
}

/**
 * 调用退出登录能力; IPC 调用本身失败时只记录日志, 主进程无论云端结果如何都会清除会话.
 */
async function requestLogout(): Promise<void> {
  try {
    await authClient.logout()
  } catch (error) {
    console.error('auth: 退出登录调用失败', error)
  }
}

/**
 * 管理退出登录过程, 完成后交给装配层决定去向.
 * @param onLoggedOut 退出登录完成后的回调.
 * @returns 进行状态与操作.
 */
export function useLogout(onLoggedOut: () => void | Promise<void>): LogoutState {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const logout = async (): Promise<void> => {
    if (isLoggingOut) {
      return
    }
    setIsLoggingOut(true)
    await requestLogout()
    await onLoggedOut()
  }

  return { isLoggingOut, logout }
}
