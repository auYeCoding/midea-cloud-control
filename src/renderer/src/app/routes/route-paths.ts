import { generatePath } from 'react-router'

/**
 * 应用内各页面的路由路径, 只在装配层定义.
 */
export const ROUTE_PATHS = {
  LOGIN: '/login',
  DEVICES: '/devices',
  AIR_CONDITIONER: '/devices/:applianceCode'
} as const

/**
 * 生成某台空调设置页的路径.
 * @param applianceCode 设备唯一标识.
 * @returns 设置页路径.
 */
export function buildAirConditionerPath(applianceCode: string): string {
  return generatePath(ROUTE_PATHS.AIR_CONDITIONER, { applianceCode })
}
