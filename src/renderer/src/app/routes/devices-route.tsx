import { useState } from 'react'
import { Navigate, useLoaderData, useNavigate, useRevalidator } from 'react-router'

import { useLogout } from '@renderer/features/auth'
import { DeviceListPage } from '@renderer/features/devices'

import type { DeviceSummary } from '../../../../shared/devices'
import type { AirConditionerRouteState } from './air-conditioner-route'
import { ConnectedDeviceCard } from './connected-device-card'
import type { devicesLoader } from './devices-loader'
import type { LoginRouteState } from './login-route'
import { buildAirConditionerPath, ROUTE_PATHS } from './route-paths'

/**
 * 设备列表路由: 把加载结果, 重新拉取, 退出登录交给设备列表页, 并为每台设备组合带实时状态与快捷控制的卡片;
 * 点刷新时同时重新拉取列表与各卡片的状态; 会话失效且无法续期时带着提示信息回到登录页.
 * @returns 设备列表页元素或跳转元素.
 */
export function DevicesRoute(): React.JSX.Element {
  const result = useLoaderData<typeof devicesLoader>()
  const revalidator = useRevalidator()
  const navigate = useNavigate()
  const { isLoggingOut, logout } = useLogout(() => navigate(ROUTE_PATHS.LOGIN, { replace: true }))
  const [refreshCount, setRefreshCount] = useState(0)

  if (!result.ok && result.isSessionExpired === true) {
    const state: LoginRouteState = { sessionExpired: { cloudMessage: result.cloudMessage } }
    return <Navigate to={ROUTE_PATHS.LOGIN} replace state={state} />
  }

  const handleRefresh = (): void => {
    setRefreshCount((count) => count + 1)
    void revalidator.revalidate()
  }

  const handleOpenDevice = (device: DeviceSummary): void => {
    const state: AirConditionerRouteState = { deviceName: device.name }
    void navigate(buildAirConditionerPath(device.applianceCode), { state })
  }

  const handleSessionExpired = (cloudMessage: string | undefined): void => {
    const state: LoginRouteState = { sessionExpired: { cloudMessage } }
    void navigate(ROUTE_PATHS.LOGIN, { replace: true, state })
  }

  return (
    <DeviceListPage
      result={result}
      isRefreshing={revalidator.state === 'loading'}
      onRefresh={handleRefresh}
      isLoggingOut={isLoggingOut}
      onLogout={() => void logout()}
      renderDevice={(device) => (
        <ConnectedDeviceCard
          key={`${device.applianceCode}-${String(refreshCount)}`}
          device={device}
          onOpen={handleOpenDevice}
          onSessionExpired={handleSessionExpired}
        />
      )}
    />
  )
}
