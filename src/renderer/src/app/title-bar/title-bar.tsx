import { useTranslation } from 'react-i18next'

import appIcon from '../../../../../resources/icon.png'

import { ThemeToggleButton } from './theme-toggle-button'
import { WindowControlButtons } from './window-control-buttons'

/**
 * 完全自绘的窗口标题栏: 左侧为应用图标与名称, 右侧依次为明暗切换与窗口控制按钮.
 * 整条标题栏可拖动窗口, 双击可最大化或还原.
 * @returns 标题栏元素.
 */
export function TitleBar(): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <header className="flex block-9 shrink-0 items-center border-be bg-background select-none app-region-drag">
      <div className="flex min-inline-0 flex-1 items-center gap-2 ps-3">
        <img src={appIcon} alt="" className="block-4 inline-4 shrink-0" draggable={false} />
        <span className="truncate text-xs font-medium text-foreground">{t('app.name')}</span>
      </div>
      <div className="flex block-full items-stretch">
        <ThemeToggleButton />
        <WindowControlButtons />
      </div>
    </header>
  )
}
