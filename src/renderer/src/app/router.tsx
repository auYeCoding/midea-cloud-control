import { createHashRouter, redirect } from 'react-router'

import { RootLayout } from './layouts/root-layout'
import { airConditionerLoader } from './routes/air-conditioner-loader'
import { AirConditionerRoute } from './routes/air-conditioner-route'
import { devicesLoader } from './routes/devices-loader'
import { DevicesRoute } from './routes/devices-route'
import { LoginRoute } from './routes/login-route'
import { ROUTE_PATHS } from './routes/route-paths'

/**
 * 根路径的去向: 统一进入设备列表, 由其守卫决定是否转到登录页.
 * @returns 跳转到设备列表的响应.
 */
function redirectToDevices(): Response {
  return redirect(ROUTE_PATHS.DEVICES)
}

/**
 * 应用路由表. 生产环境以 file:// 加载页面, 故使用 hash 路由, 无需服务端回退.
 */
export const router = createHashRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, loader: redirectToDevices },
      { path: ROUTE_PATHS.LOGIN, Component: LoginRoute },
      { path: ROUTE_PATHS.DEVICES, loader: devicesLoader, Component: DevicesRoute },
      {
        path: ROUTE_PATHS.AIR_CONDITIONER,
        loader: airConditionerLoader,
        Component: AirConditionerRoute
      }
    ]
  }
])
