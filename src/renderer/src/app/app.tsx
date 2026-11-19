import { RouterProvider } from 'react-router/dom'

import { ThemeProvider } from '@renderer/lib/theme'

import { router } from './router'

/**
 * 渲染进程根组件, 装配全局 provider 与路由.
 * @returns 根组件元素.
 */
export function App(): React.JSX.Element {
  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}
