import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

import type { PreloadApi } from '../shared/preload-api'
import { airConditioner } from './air-conditioner'
import { airConditionerPresets } from './air-conditioner-presets'
import { auth } from './auth'
import { devices } from './devices'
import { windowControls } from './window-controls'

/**
 * 暴露给渲染进程的项目自定义 API.
 */
const api: PreloadApi = {
  windowControls,
  auth,
  devices,
  airConditioner,
  airConditionerPresets
}

/**
 * 将 Electron API 与自定义 API 暴露到渲染进程的 window 对象上.
 * 启用上下文隔离时经 contextBridge 暴露, 否则直接挂到全局对象.
 */
function exposeApis(): void {
  if (process.contextIsolated) {
    try {
      contextBridge.exposeInMainWorld('electron', electronAPI)
      contextBridge.exposeInMainWorld('api', api)
    } catch (error) {
      console.error(error)
    }
  } else {
    Object.assign(window, { electron: electronAPI, api })
  }
}

exposeApis()
