import { useTranslation } from 'react-i18next'
import { ChevronDown, Play } from 'lucide-react'
import { cn } from 'cn'

import { Button } from '@renderer/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { Spinner } from '@renderer/components/ui/spinner'

import type { AirConditionerPreset } from '../../../../shared/air-conditioner-presets'

/**
 * PresetRunMenu 的属性.
 */
interface PresetRunMenuProps {
  /**
   * 可运行的预设.
   */
  readonly presets: readonly AirConditionerPreset[]
  /**
   * 是否不可操作 (如尚未同步到状态, 或同步, 下发进行中).
   */
  readonly isDisabled: boolean
  /**
   * 是否正在应用预设; 为 true 时按钮图标显示加载状态.
   */
  readonly isRunning: boolean
  /**
   * 选中一套预设时的回调.
   */
  readonly onApply: (preset: AirConditionerPreset) => void
  /**
   * 列表底部的附加菜单项 (如 "管理预设"); 有内容时与预设之间以分隔线隔开.
   */
  readonly children?: React.ReactNode
  /**
   * 触发按钮的附加样式.
   */
  readonly className?: string
}

/**
 * "运行预设" 下拉菜单: 按钮展开预设列表, 选中即运行; 没有预设时给出提示; 底部可追加附加菜单项.
 * 展开时按钮上的箭头翻转.
 * @param props 组件属性.
 * @returns 菜单元素.
 */
export function PresetRunMenu({
  presets,
  isDisabled,
  isRunning,
  onApply,
  children,
  className
}: PresetRunMenuProps): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isDisabled}
          className={cn('group/preset shrink-0', className)}
        >
          {isRunning ? <Spinner aria-hidden /> : <Play aria-hidden />}
          {t('airConditioner.quick.runPreset')}
          <ChevronDown
            aria-hidden
            className="transition-transform duration-200 ease-out group-aria-expanded/preset:rotate-180"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-inline-44">
        {presets.length === 0 ? (
          <DropdownMenuItem disabled>{t('airConditioner.quick.noPresets')}</DropdownMenuItem>
        ) : (
          presets.map((preset) => (
            <DropdownMenuItem
              key={preset.id}
              onSelect={() => onApply(preset)}
              className="justify-between gap-4"
            >
              <span className="truncate">{preset.name}</span>
              <Play aria-hidden className="text-muted-foreground" />
            </DropdownMenuItem>
          ))
        )}
        {children !== undefined && (
          <>
            <DropdownMenuSeparator />
            {children}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
