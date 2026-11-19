import './styles/theme.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app/app'
import { initializeI18n } from './lib/i18n'

/**
 * index.html 中 React 根节点的元素 ID.
 */
const ROOT_ELEMENT_ID = 'root'

/**
 * 查找 React 根节点并挂载根组件.
 * @throws Error 当页面中不存在根节点时.
 */
function mountApp(): void {
  const rootElement = document.getElementById(ROOT_ELEMENT_ID)
  if (rootElement === null) {
    throw new Error(`renderer: 未找到 id 为 "${ROOT_ELEMENT_ID}" 的根节点`)
  }
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}

/**
 * 渲染进程启动流程: 先完成 i18n 初始化, 再挂载界面, 避免首屏出现未翻译的键名.
 */
async function bootstrap(): Promise<void> {
  await initializeI18n()
  mountApp()
}

bootstrap().catch((error: unknown) => {
  console.error('renderer: 启动失败', error)
})
