import { redirect } from 'react-router'

import { authClient } from '@renderer/features/auth'
import { loadAirConditioners } from '@renderer/features/devices'

import type { DeviceListResult } from '../../../../shared/devices'
import { ROUTE_PATHS } from './route-paths'

/**
 * 设备列表的路由守卫与数据加载: 未登录时转到登录页, 否则拉取空调列表.
 * @returns 跳转响应或空调列表结果.
 */
export async function devicesLoader(): Promise<Response | DeviceListResult> {
  if (!(await authClient.isLoggedIn())) {
    return redirect(ROUTE_PATHS.LOGIN)
  }
  return loadAirConditioners()
}
