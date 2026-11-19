import { useLocation, useNavigate, useParams } from 'react-router'

import { AirConditionerPage } from '@renderer/features/air-conditioner'

import type { LoginRouteState } from './login-route'
import { ROUTE_PATHS } from './route-paths'

/**
 * 从设备列表进入设置页时附带的导航状态.
 */
export interface AirConditionerRouteState {
  /**
   * 设备名称.
   */
  readonly deviceName: string
}

/**
 * 从导航状态中取出设备名称.
 * @param state 导航状态, 来源不受类型约束.
 * @returns 设备名称; 没有时返回 undefined.
 */
function readDeviceName(state: unknown): string | undefined {
  if (typeof state !== 'object' || state === null || !('deviceName' in state)) {
    return undefined
  }
  return typeof state.deviceName === 'string' ? state.deviceName : undefined
}

/**
 * 空调设置页路由: 从路径取设备标识, 从导航状态取设备名称; 返回时回到设备列表,
 * 会话失效且无法续期时带着提示信息回到登录页.
 * @returns 设置页元素.
 */
export function AirConditionerRoute(): React.JSX.Element {
  const { applianceCode = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()

  const handleSessionExpired = (cloudMessage: string | undefined): void => {
    const state: LoginRouteState = { sessionExpired: { cloudMessage } }
    void navigate(ROUTE_PATHS.LOGIN, { replace: true, state })
  }

  return (
    <AirConditionerPage
      key={applianceCode}
      applianceCode={applianceCode}
      deviceName={readDeviceName(location.state)}
      onBack={() => void navigate(ROUTE_PATHS.DEVICES)}
      onSessionExpired={handleSessionExpired}
    />
  )
}
