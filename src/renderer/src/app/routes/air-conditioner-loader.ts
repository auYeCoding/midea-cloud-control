import { redirect } from 'react-router'

import { authClient } from '@renderer/features/auth'

import { ROUTE_PATHS } from './route-paths'

/**
 * 空调设置页的路由守卫: 未登录时转到登录页; 状态由设置页进入后自行同步, 以便显示加载状态.
 * @returns 跳转响应; 已登录时返回 null.
 */
export async function airConditionerLoader(): Promise<Response | null> {
  if (!(await authClient.isLoggedIn())) {
    return redirect(ROUTE_PATHS.LOGIN)
  }
  return null
}
