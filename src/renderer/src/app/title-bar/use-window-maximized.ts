import { useEffect, useState } from 'react'

import { windowControls } from '@renderer/lib/window-controls'

/**
 * 跟踪当前窗口是否最大化: 挂载时查询一次, 之后跟随主进程推送更新.
 * @returns 窗口处于最大化状态时为 true.
 */
export function useWindowMaximized(): boolean {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    let isActive = true
    windowControls
      .isMaximized()
      .then((value) => {
        if (isActive) {
          setIsMaximized(value)
        }
      })
      .catch((error: unknown) => console.error('title-bar: 查询最大化状态失败', error))
    const unsubscribe = windowControls.onMaximizedChange(setIsMaximized)
    return () => {
      isActive = false
      unsubscribe()
    }
  }, [])

  return isMaximized
}
