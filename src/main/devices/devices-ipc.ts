import { ipcMain } from 'electron'

import { DEVICES_CHANNELS, type DeviceListResult } from '../../shared/devices'
import { toCloudFailure } from '../cloud/cloud-failure'
import { listAirConditioners } from './device-service'

/**
 * 处理拉取空调列表的请求, 把异常转换为失败结果.
 * @returns 空调列表结果.
 */
async function handleListAirConditioners(): Promise<DeviceListResult> {
  try {
    return { ok: true, devices: await listAirConditioners() }
  } catch (error) {
    return toCloudFailure('devices', error)
  }
}

/**
 * 注册设备相关的 IPC 处理器, 应用生命周期内只调用一次.
 */
export function registerDevicesHandlers(): void {
  ipcMain.handle(DEVICES_CHANNELS.LIST_AIR_CONDITIONERS, () => handleListAirConditioners())
}
