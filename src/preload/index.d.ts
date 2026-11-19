import { ElectronAPI } from '@electron-toolkit/preload'

import type { PreloadApi } from '../shared/preload-api'

declare global {
  /**
   * 渲染进程全局对象, 扩展了 preload 暴露的 API.
   */
  interface Window {
    /**
     * @electron-toolkit/preload 提供的 Electron API.
     */
    electron: ElectronAPI
    /**
     * 项目自定义的 preload API; 在非 Electron 环境 (如浏览器预览) 中不存在.
     */
    api?: PreloadApi
  }
}
