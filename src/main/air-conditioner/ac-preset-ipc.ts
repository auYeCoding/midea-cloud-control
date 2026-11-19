import { ipcMain } from 'electron'

import { AIR_CONDITIONER_PRESET_CHANNELS } from '../../shared/air-conditioner-presets'
import { runControlOperation } from './ac-ipc'
import {
  applyPreset,
  listAirConditionerPresets,
  overwritePreset,
  removePreset,
  renamePreset,
  saveCurrentAsPreset
} from './ac-preset-service'

/**
 * 注册空调预设相关的 IPC 处理器, 应用生命周期内只调用一次.
 * 应用预设与下发控制共用失败处理: 失败时带上主进程已知的空调最新状态.
 */
export function registerAirConditionerPresetHandlers(): void {
  ipcMain.handle(AIR_CONDITIONER_PRESET_CHANNELS.LIST, (_event, applianceCode: string) =>
    listAirConditionerPresets(applianceCode)
  )
  ipcMain.handle(
    AIR_CONDITIONER_PRESET_CHANNELS.SAVE_CURRENT,
    (_event, applianceCode: string, name: string) => saveCurrentAsPreset(applianceCode, name)
  )
  ipcMain.handle(
    AIR_CONDITIONER_PRESET_CHANNELS.RENAME,
    (_event, applianceCode: string, presetId: string, name: string) =>
      renamePreset(applianceCode, presetId, name)
  )
  ipcMain.handle(
    AIR_CONDITIONER_PRESET_CHANNELS.OVERWRITE,
    (_event, applianceCode: string, presetId: string) => overwritePreset(applianceCode, presetId)
  )
  ipcMain.handle(
    AIR_CONDITIONER_PRESET_CHANNELS.REMOVE,
    (_event, applianceCode: string, presetId: string) => removePreset(applianceCode, presetId)
  )
  ipcMain.handle(
    AIR_CONDITIONER_PRESET_CHANNELS.APPLY,
    (_event, applianceCode: string, presetId: string) =>
      runControlOperation(applianceCode, () => applyPreset(applianceCode, presetId))
  )
}
