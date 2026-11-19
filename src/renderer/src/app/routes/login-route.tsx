import { useLocation, useNavigate } from 'react-router'

import { LoginPage, type SessionExpiredInfo } from '@renderer/features/auth'

import { ROUTE_PATHS } from './route-paths'

/**
 * 跳转到登录页时可附带的导航状态.
 */
export interface LoginRouteState {
  /**
   * 会话失效且无法续期时的提示信息.
   */
  readonly sessionExpired: SessionExpiredInfo
}

/**
 * 从导航状态中取出会话失效信息.
 * @param state 导航状态, 来源不受类型约束.
 * @returns 会话失效信息; 没有时返回 undefined.
 */
function readSessionExpired(state: unknown): SessionExpiredInfo | undefined {
  if (typeof state !== 'object' || state === null || !('sessionExpired' in state)) {
    return undefined
  }
  const { sessionExpired } = state
  if (typeof sessionExpired !== 'object' || sessionExpired === null) {
    return undefined
  }
  const cloudMessage =
    'cloudMessage' in sessionExpired && typeof sessionExpired.cloudMessage === 'string'
      ? sessionExpired.cloudMessage
      : undefined
  return { cloudMessage }
}

/**
 * 登录路由: 登录成功后跳转到设备列表, 并替换掉登录页的历史记录; 因会话失效而来时显示提示.
 * @returns 登录页元素.
 */
export function LoginRoute(): React.JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  return (
    <LoginPage
      sessionExpired={readSessionExpired(location.state)}
      onLoggedIn={() => navigate(ROUTE_PATHS.DEVICES, { replace: true })}
    />
  )
}
