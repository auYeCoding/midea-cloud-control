import type { ReactNode } from 'react'

import { Button } from '@renderer/components/ui/button'
import { cn } from 'cn'

/**
 * 标题栏按钮的视觉语气: default 为普通悬停, danger 用于关闭按钮的危险色悬停.
 */
export type TitleBarButtonTone = 'default' | 'danger'

/**
 * TitleBarButton 的属性.
 */
interface TitleBarButtonProps {
  /**
   * 按钮的无障碍名称.
   */
  readonly label: string
  /**
   * 按钮图标.
   */
  readonly icon: ReactNode
  /**
   * 点击回调.
   */
  readonly onClick: () => void
  /**
   * 视觉语气, 默认 default.
   */
  readonly tone?: TitleBarButtonTone
}

/**
 * 各语气对应的悬停样式.
 */
const TONE_CLASS_NAMES: Readonly<Record<TitleBarButtonTone, string>> = {
  default: 'hover:bg-muted dark:hover:bg-muted',
  danger:
    'hover:bg-destructive hover:text-destructive-foreground dark:hover:bg-destructive dark:hover:text-destructive-foreground'
}

/**
 * 标题栏右侧的方形图标按钮, 占满标题栏高度, 不参与窗口拖动.
 * @param props 组件属性.
 * @returns 按钮元素.
 */
export function TitleBarButton({
  label,
  icon,
  onClick,
  tone = 'default'
}: TitleBarButtonProps): React.JSX.Element {
  return (
    <Button
      variant="ghost"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'block-full inline-11 rounded-none px-0 text-muted-foreground app-region-no-drag hover:text-foreground',
        TONE_CLASS_NAMES[tone]
      )}
    >
      {icon}
    </Button>
  )
}
