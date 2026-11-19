import { ipcRenderer } from 'electron'

import { AIR_CONDITIONER_CHANNELS, type AirConditionerApi } from '../shared/air-conditioner'

/**
 * 基于 IPC 的空调控制实现, 由 preload 暴露给渲染进程; 只转发调用, 不含任何加密或组帧逻辑.
 */
export const airConditioner: AirConditionerApi = {
  getStatus: (applianceCode) =>
    ipcRenderer.invoke(AIR_CONDITIONER_CHANNELS.GET_STATUS, applianceCode),
  control: (applianceCode, control) =>
    ipcRenderer.invoke(AIR_CONDITIONER_CHANNELS.CONTROL, applianceCode, control)
}
