import { ipcRenderer, type IpcRendererEvent } from 'electron'

import {
  WINDOW_CONTROL_CHANNELS,
  type MaximizedChangeListener,
  type WindowControlsApi
} from '../shared/window-controls'

/**
 * 订阅主进程推送的最大化状态变化.
 * @param listener 状态变化时的回调.
 * @returns 取消订阅的函数.
 */
function onMaximizedChange(listener: MaximizedChangeListener): () => void {
  const handleChange = (_event: IpcRendererEvent, isMaximized: boolean): void =>
    listener(isMaximized)
  ipcRenderer.on(WINDOW_CONTROL_CHANNELS.MAXIMIZED_CHANGED, handleChange)
  return () => {
    ipcRenderer.removeListener(WINDOW_CONTROL_CHANNELS.MAXIMIZED_CHANGED, handleChange)
  }
}

/**
 * 基于 IPC 的窗口控制实现, 由 preload 暴露给渲染进程.
 */
export const windowControls: WindowControlsApi = {
  minimize: () => ipcRenderer.send(WINDOW_CONTROL_CHANNELS.MINIMIZE),
  toggleMaximize: () => ipcRenderer.send(WINDOW_CONTROL_CHANNELS.TOGGLE_MAXIMIZE),
  close: () => ipcRenderer.send(WINDOW_CONTROL_CHANNELS.CLOSE),
  isMaximized: () => ipcRenderer.invoke(WINDOW_CONTROL_CHANNELS.IS_MAXIMIZED),
  onMaximizedChange
}
