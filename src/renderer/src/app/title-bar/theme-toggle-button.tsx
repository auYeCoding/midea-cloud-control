import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useTheme } from '@renderer/lib/theme'

import { TitleBarButton } from './title-bar-button'
import { TITLE_BAR_ICON_PROPS } from './title-bar-icon'

/**
 * 明暗切换按钮: 显示将要切换到的模式图标, 点击后把主题偏好固定为该模式.
 * @returns 按钮元素.
 */
export function ThemeToggleButton(): React.JSX.Element {
  const { t } = useTranslation()
  const { resolvedTheme, setPreference } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <TitleBarButton
      label={isDark ? t('titleBar.switchToLight') : t('titleBar.switchToDark')}
      icon={isDark ? <Sun {...TITLE_BAR_ICON_PROPS} /> : <Moon {...TITLE_BAR_ICON_PROPS} />}
      onClick={() => setPreference(isDark ? 'light' : 'dark')}
    />
  )
}
