import { useTranslation } from 'react-i18next'
import { Ellipsis, PencilLine, Play, RefreshCcw, Trash2 } from 'lucide-react'

import { Button } from '@renderer/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'

import type { AirConditionerPreset } from '../../../../shared/air-conditioner-presets'

/**
 * PresetListItem 的属性.
 */
interface PresetListItemProps {
  /**
   * 预设.
   */
  readonly preset: AirConditionerPreset
  /**
   * 应用按钮与更多操作是否可用.
   */
  readonly isEnabled: boolean
  /**
   * 应用该预设.
   */
  readonly onApply: () => void
  /**
   * 打开改名对话框.
   */
  readonly onRename: () => void
  /**
   * 用当前设置覆盖该预设.
   */
  readonly onOverwrite: () => void
  /**
   * 打开删除确认.
   */
  readonly onDelete: () => void
}

/**
 * 预设列表中的一行: 点名称即应用 (开机并切换到整组设置), 行末菜单提供改名, 用当前设置更新与删除.
 * 出现时轻微淡入下落; 悬停时应用图标微微前移提示可点. 菜单为非模态, 选中菜单项后打开的对话框
 * 不会与菜单的焦点锁定冲突.
 * @param props 组件属性.
 * @returns 列表项元素.
 */
export function PresetListItem({
  preset,
  isEnabled,
  onApply,
  onRename,
  onOverwrite,
  onDelete
}: PresetListItemProps): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <li className="flex items-center gap-1 duration-200 ease-out animate-in fade-in motion-safe:slide-in-from-top-1">
      <Button
        variant="ghost"
        className="min-inline-0 flex-1 justify-start"
        disabled={!isEnabled}
        aria-label={t('airConditioner.presets.apply', { name: preset.name })}
        onClick={onApply}
      >
        <Play
          aria-hidden
          className="text-muted-foreground transition-transform duration-150 ease-out motion-safe:group-hover/button:translate-x-0.5"
        />
        <span className="truncate">{preset.name}</span>
      </Button>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={!isEnabled}
            aria-label={t('airConditioner.presets.moreActions', { name: preset.name })}
          >
            <Ellipsis aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-inline-40">
          <DropdownMenuItem onSelect={onRename}>
            <PencilLine aria-hidden />
            {t('airConditioner.presets.rename')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onOverwrite}>
            <RefreshCcw aria-hidden />
            {t('airConditioner.presets.overwrite')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 aria-hidden />
            {t('airConditioner.presets.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}
