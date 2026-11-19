import { ipcRenderer } from 'electron'

import {
  AIR_CONDITIONER_PRESET_CHANNELS,
  type AirConditionerPresetsApi
} from '../shared/air-conditioner-presets'

/**
 * 基于 IPC 的空调预设实现, 由 preload 暴露给渲染进程; 只转发调用, 预设的保存与应用都在主进程.
 */
export const airConditionerPresets: AirConditionerPresetsApi = {
  list: (applianceCode) => ipcRenderer.invoke(AIR_CONDITIONER_PRESET_CHANNELS.LIST, applianceCode),
  saveCurrent: (applianceCode, name) =>
    ipcRenderer.invoke(AIR_CONDITIONER_PRESET_CHANNELS.SAVE_CURRENT, applianceCode, name),
  rename: (applianceCode, presetId, name) =>
    ipcRenderer.invoke(AIR_CONDITIONER_PRESET_CHANNELS.RENAME, applianceCode, presetId, name),
  overwrite: (applianceCode, presetId) =>
    ipcRenderer.invoke(AIR_CONDITIONER_PRESET_CHANNELS.OVERWRITE, applianceCode, presetId),
  remove: (applianceCode, presetId) =>
    ipcRenderer.invoke(AIR_CONDITIONER_PRESET_CHANNELS.REMOVE, applianceCode, presetId),
  apply: (applianceCode, presetId) =>
    ipcRenderer.invoke(AIR_CONDITIONER_PRESET_CHANNELS.APPLY, applianceCode, presetId)
}
