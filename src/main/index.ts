import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import { registerAirConditionerHandlers } from './air-conditioner/ac-ipc'
import { registerAirConditionerPresetHandlers } from './air-conditioner/ac-preset-ipc'
import { registerAuthHandlers } from './auth/auth-ipc'
import { registerDevicesHandlers } from './devices/devices-ipc'
import { forwardMaximizedState, registerWindowControlHandlers } from './window-controls'

/**
 * Windows 应用用户模型 ID, 与 electron-builder.yml 中的 appId 保持一致.
 */
const APP_USER_MODEL_ID = 'com.auyecode.midea-cloud-control'

/**
 * 主窗口初始宽度, 单位为像素.
 */
const MAIN_WINDOW_WIDTH = 1000

/**
 * 主窗口初始高度, 单位为像素.
 */
const MAIN_WINDOW_HEIGHT = 600

/**
 * 主窗口最小宽度, 单位为像素; 保证设备卡片网格与设置页在最小窗口下仍能完整铺下.
 */
const MAIN_WINDOW_MIN_WIDTH = 800

/**
 * 主窗口最小高度, 单位为像素; 保证设备卡片网格与设置页在最小窗口下仍能完整铺下.
 */
const MAIN_WINDOW_MIN_HEIGHT = 600

/**
 * 创建主窗口, 开发模式加载 dev server 地址, 生产模式加载打包后的页面.
 * 窗口无系统边框, 标题栏与窗口控制按钮全部由渲染进程自绘.
 */
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: MAIN_WINDOW_WIDTH,
    height: MAIN_WINDOW_HEIGHT,
    minWidth: MAIN_WINDOW_MIN_WIDTH,
    minHeight: MAIN_WINDOW_MIN_HEIGHT,
    show: false,
    frame: false,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  forwardMaximizedState(mainWindow)

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

/**
 * 应用就绪后的初始化: 设置应用 ID, 注册窗口控制, 登录, 设备, 空调与空调预设的 IPC 处理器及窗口快捷键,
 * 并创建主窗口.
 */
function handleAppReady(): void {
  electronApp.setAppUserModelId(APP_USER_MODEL_ID)
  registerWindowControlHandlers()
  registerAuthHandlers()
  registerDevicesHandlers()
  registerAirConditionerHandlers()
  registerAirConditionerPresetHandlers()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}

/**
 * 所有窗口关闭后退出应用; macOS 按平台惯例保持应用运行.
 */
function handleWindowAllClosed(): void {
  if (process.platform !== 'darwin') {
    app.quit()
  }
}

app.whenReady().then(handleAppReady)

app.on('window-all-closed', handleWindowAllClosed)
