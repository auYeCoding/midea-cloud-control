import { Outlet } from 'react-router'

import { TitleBar } from '../title-bar/title-bar'

/**
 * 根布局, 所有路由页面的公共外壳: 顶部为自绘标题栏, 其下为可滚动的内容区.
 * @returns 根布局元素.
 */
export function RootLayout(): React.JSX.Element {
  return (
    <div className="flex block-screen flex-col overflow-hidden">
      <TitleBar />
      <main className="min-block-0 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
