import { useContext } from 'react'

import { ThemeContext, type ThemeContextValue } from './theme-context'

/**
 * 读取主题状态与切换操作.
 * @returns 主题上下文的值.
 * @throws Error 当调用方不在 ThemeProvider 内时.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('theme: useTheme 必须在 ThemeProvider 内使用')
  }
  return context
}
