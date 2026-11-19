import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  THEME_PREFERENCES,
  ThemeContext,
  type ResolvedTheme,
  type ThemeContextValue,
  type ThemePreference
} from './theme-context'

/**
 * 主题偏好在 localStorage 中的键名.
 */
const STORAGE_KEY = 'theme-preference'

/**
 * 判断系统是否处于暗色模式的媒体查询.
 */
const DARK_COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)'

/**
 * 暗色主题在根元素上使用的 class 名, 与 theme.css 中的 dark 变体一致.
 */
const DARK_CLASS_NAME = 'dark'

/**
 * 切换主题期间加在根元素上的 class 名, 与 theme.css 中禁用过渡的规则一致.
 */
const THEME_SWITCHING_CLASS_NAME = 'theme-switching'

/**
 * ThemeProvider 的属性.
 */
interface ThemeProviderProps {
  /**
   * 受主题控制的子树.
   */
  readonly children: ReactNode
}

/**
 * 判断任意字符串是否为合法的主题偏好.
 * @param value 待判断的值.
 * @returns 合法时返回 true.
 */
function isThemePreference(value: string | null): value is ThemePreference {
  return THEME_PREFERENCES.some((preference) => preference === value)
}

/**
 * 读取已保存的主题偏好, 无有效记录时回退为跟随系统.
 * @returns 主题偏好.
 */
function readStoredPreference(): ThemePreference {
  const storedValue = localStorage.getItem(STORAGE_KEY)
  return isThemePreference(storedValue) ? storedValue : 'system'
}

/**
 * 在根元素上应用主题, 期间临时禁用全部 CSS 过渡.
 * 做法与 next-themes 的 disableTransitionOnChange 一致: 先禁用过渡再切换 class,
 * 强制重新计算样式使新颜色立即生效, 下一个 tick 再恢复过渡, 避免颜色从旧主题渐变造成闪烁.
 * @param theme 要应用的主题.
 */
function applyTheme(theme: ResolvedTheme): void {
  const root = document.documentElement
  root.classList.add(THEME_SWITCHING_CLASS_NAME)
  root.classList.toggle(DARK_CLASS_NAME, theme === 'dark')
  window.getComputedStyle(document.body)
  setTimeout(() => root.classList.remove(THEME_SWITCHING_CLASS_NAME), 1)
}

/**
 * 读取操作系统当前的明暗模式.
 * @returns 系统主题.
 */
function readSystemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_COLOR_SCHEME_QUERY).matches ? 'dark' : 'light'
}

/**
 * 主题提供者: 管理主题偏好, 跟随系统明暗变化, 并在根元素上切换暗色 class.
 * @param props 组件属性.
 * @returns 包裹子树的主题上下文.
 */
export function ThemeProvider({ children }: ThemeProviderProps): React.JSX.Element {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(readSystemTheme)

  const resolvedTheme: ResolvedTheme = preference === 'system' ? systemTheme : preference

  useEffect(() => {
    const mediaQuery = window.matchMedia(DARK_COLOR_SCHEME_QUERY)
    const handleChange = (): void => setSystemTheme(readSystemTheme())
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme])

  const setPreference = useCallback((nextPreference: ThemePreference): void => {
    localStorage.setItem(STORAGE_KEY, nextPreference)
    setPreferenceState(nextPreference)
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
