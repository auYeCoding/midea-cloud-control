import type { WindowControlsApi } from '../../../shared/window-controls'

/**
 * 非 Electron 环境 (如浏览器预览) 下的空实现, 使界面可脱离主进程渲染与调试.
 */
const DETACHED_WINDOW_CONTROLS: WindowControlsApi = {
  minimize: () => undefined,
  toggleMaximize: () => undefined,
  close: () => undefined,
  isMaximized: () => Promise.resolve(false),
  onMaximizedChange: () => () => undefined
}

/**
 * 渲染进程访问窗口控制能力的唯一入口, 屏蔽 preload 桥是否存在的差异.
 */
export const windowControls: WindowControlsApi =
  window.api?.windowControls ?? DETACHED_WINDOW_CONTROLS
