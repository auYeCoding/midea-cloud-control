import type { LucideIcon } from 'lucide-react'
import { cn } from 'cn'

import { Card } from '@renderer/components/ui/card'

/**
 * SettingsPanel 的属性.
 */
interface SettingsPanelProps {
  /**
   * 标题前的小图标; 省略时只显示标题文字.
   */
  readonly icon?: LucideIcon
  /**
   * 标题.
   */
  readonly title: string
  /**
   * 标题行右侧的操作 (如开关); 省略时不显示.
   */
  readonly action?: React.ReactNode
  /**
   * 面板内容.
   */
  readonly children: React.ReactNode
  /**
   * 附加样式, 用于在页面网格中控制伸缩.
   */
  readonly className?: string
}

/**
 * 设置页的紧凑面板: 标题行 (图标, 标题, 可选操作) 与内容, 内边距与间距比通用卡片更紧, 适合同屏排布多块设置.
 * 悬停时边框轻微加深.
 * @param props 组件属性.
 * @returns 面板元素.
 */
export function SettingsPanel({
  icon: Icon,
  title,
  action,
  children,
  className
}: SettingsPanelProps): React.JSX.Element {
  return (
    <Card
      size="sm"
      className={cn(
        'min-block-0 gap-2 px-3 short:gap-1 short:py-2 transition-shadow duration-200 ease-out hover:ring-foreground/20',
        className
      )}
    >
      <div className="flex min-block-7 items-center short:min-block-6 justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
          {Icon !== undefined && <Icon aria-hidden className="block-3.5 inline-3.5" />}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </Card>
  )
}
