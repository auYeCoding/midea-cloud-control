import { Copy, Minus, Square, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { windowControls } from '@renderer/lib/window-controls'

import { TitleBarButton } from './title-bar-button'
import { TITLE_BAR_ICON_PROPS } from './title-bar-icon'
import { useWindowMaximized } from './use-window-maximized'

/**
 * 最小化, 最大化/还原, 关闭三个窗口控制按钮, 最大化按钮随窗口状态切换图标.
 * @returns 按钮组元素.
 */
export function WindowControlButtons(): React.JSX.Element {
  const { t } = useTranslation()
  const isMaximized = useWindowMaximized()

  return (
    <>
      <TitleBarButton
        label={t('titleBar.minimize')}
        icon={<Minus {...TITLE_BAR_ICON_PROPS} />}
        onClick={windowControls.minimize}
      />
      <TitleBarButton
        label={isMaximized ? t('titleBar.restore') : t('titleBar.maximize')}
        icon={
          isMaximized ? (
            <Copy {...TITLE_BAR_ICON_PROPS} className="block-3.5 inline-3.5 -scale-x-100" />
          ) : (
            <Square {...TITLE_BAR_ICON_PROPS} className="block-3.5 inline-3.5" />
          )
        }
        onClick={windowControls.toggleMaximize}
      />
      <TitleBarButton
        label={t('titleBar.close')}
        icon={<X {...TITLE_BAR_ICON_PROPS} />}
        onClick={windowControls.close}
        tone="danger"
      />
    </>
  )
}
