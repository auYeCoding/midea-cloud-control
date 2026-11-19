import { createContext } from 'react'

/**
 * 用户可选的主题偏好, system 表示跟随操作系统.
 */
export type ThemePreference = 'system' | 'light' | 'dark'

/**
 * 实际生效的主题.
 */
export type ResolvedTheme = 'light' | 'dark'

/**
 * 全部可选主题偏好, 用于校验与渲染选项.
 */
export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark']

/**
 * 主题上下文对外提供的状态与操作.
 */
export interface ThemeContextValue {
  /**
   * 当前主题偏好.
   */
  readonly preference: ThemePreference
  /**
   * 当前实际生效的主题.
   */
  readonly resolvedTheme: ResolvedTheme
  /**
   * 更新主题偏好并持久化.
   */
  readonly setPreference: (preference: ThemePreference) => void
}

/**
 * 主题上下文, 未包裹在 ThemeProvider 内时为 undefined.
 */
export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)
