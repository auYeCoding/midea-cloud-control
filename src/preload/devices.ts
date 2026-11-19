import { ipcRenderer } from 'electron'

import { DEVICES_CHANNELS, type DevicesApi } from '../shared/devices'

/**
 * 基于 IPC 的设备实现, 由 preload 暴露给渲染进程; 只转发调用.
 */
export const devices: DevicesApi = {
  listAirConditioners: () => ipcRenderer.invoke(DEVICES_CHANNELS.LIST_AIR_CONDITIONERS)
}
