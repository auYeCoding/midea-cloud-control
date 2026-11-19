import type { CloudFailure } from './auth'

/**
 * 设备相关的 IPC 通道名, 主进程与 preload 共用的唯一定义.
 */
export const DEVICES_CHANNELS = {
  LIST_AIR_CONDITIONERS: 'devices:list-air-conditioners'
} as const

/**
 * 设备摘要, 只包含列表展示所需的字段.
 */
export interface DeviceSummary {
  /**
   * 设备唯一标识.
   */
  readonly applianceCode: string
  /**
   * 用户在美居 App 中给设备起的名称.
   */
  readonly name: string
  /**
   * 设备当前是否在线.
   */
  readonly isOnline: boolean
}

/**
 * 拉取空调列表的结果.
 */
export type DeviceListResult =
  { readonly ok: true; readonly devices: readonly DeviceSummary[] } | CloudFailure

/**
 * preload 暴露给渲染进程的设备能力.
 */
export interface DevicesApi {
  /**
   * 用当前会话从云端拉取账号下全部家庭的空调.
   */
  readonly listAirConditioners: () => Promise<DeviceListResult>
}
