/**
 * 窗口控制相关的 IPC 通道名, 主进程与 preload 共用的唯一定义.
 */
export const WINDOW_CONTROL_CHANNELS = {
  MINIMIZE: 'window-controls:minimize',
  TOGGLE_MAXIMIZE: 'window-controls:toggle-maximize',
  CLOSE: 'window-controls:close',
  IS_MAXIMIZED: 'window-controls:is-maximized',
  MAXIMIZED_CHANGED: 'window-controls:maximized-changed'
} as const

/**
 * 窗口最大化状态变化的监听函数.
 */
export type MaximizedChangeListener = (isMaximized: boolean) => void

/**
 * preload 暴露给渲染进程的窗口控制能力, 供自绘标题栏使用.
 */
export interface WindowControlsApi {
  /**
   * 最小化当前窗口.
   */
  readonly minimize: () => void
  /**
   * 在最大化与还原之间切换当前窗口.
   */
  readonly toggleMaximize: () => void
  /**
   * 关闭当前窗口.
   */
  readonly close: () => void
  /**
   * 查询当前窗口是否处于最大化状态.
   */
  readonly isMaximized: () => Promise<boolean>
  /**
   * 订阅最大化状态变化, 返回取消订阅的函数.
   */
  readonly onMaximizedChange: (listener: MaximizedChangeListener) => () => void
}
