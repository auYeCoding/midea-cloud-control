import { BrowserWindow, ipcMain, type IpcMainEvent, type IpcMainInvokeEvent } from 'electron'

import { WINDOW_CONTROL_CHANNELS } from '../shared/window-controls'

/**
 * 找到发出 IPC 消息的渲染进程所属窗口.
 * @param event IPC 事件.
 * @returns 对应窗口; 窗口已销毁时返回 undefined.
 */
function findSenderWindow(event: IpcMainEvent | IpcMainInvokeEvent): BrowserWindow | undefined {
  return BrowserWindow.fromWebContents(event.sender) ?? undefined
}

/**
 * 在最大化与还原之间切换窗口.
 * @param window 目标窗口.
 */
function toggleMaximize(window: BrowserWindow): void {
  if (window.isMaximized()) {
    window.unmaximize()
  } else {
    window.maximize()
  }
}

/**
 * 注册窗口控制的 IPC 处理器, 应用生命周期内只调用一次.
 */
export function registerWindowControlHandlers(): void {
  ipcMain.on(WINDOW_CONTROL_CHANNELS.MINIMIZE, (event) => findSenderWindow(event)?.minimize())
  ipcMain.on(WINDOW_CONTROL_CHANNELS.CLOSE, (event) => findSenderWindow(event)?.close())
  ipcMain.on(WINDOW_CONTROL_CHANNELS.TOGGLE_MAXIMIZE, (event) => {
    const window = findSenderWindow(event)
    if (window !== undefined) {
      toggleMaximize(window)
    }
  })
  ipcMain.handle(
    WINDOW_CONTROL_CHANNELS.IS_MAXIMIZED,
    (event) => findSenderWindow(event)?.isMaximized() ?? false
  )
}

/**
 * 把窗口的最大化状态变化推送给其渲染进程, 让自绘标题栏同步按钮图标.
 * @param window 目标窗口.
 */
export function forwardMaximizedState(window: BrowserWindow): void {
  const send = (isMaximized: boolean): void => {
    window.webContents.send(WINDOW_CONTROL_CHANNELS.MAXIMIZED_CHANGED, isMaximized)
  }
  window.on('maximize', () => send(true))
  window.on('unmaximize', () => send(false))
}
