import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { cn } from 'cn'

import { Button } from '@renderer/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@renderer/components/ui/card'

import type { DeviceSummary } from '../../../../shared/devices'

/**
 * DeviceCard 的属性.
 */
interface DeviceCardProps {
  /**
   * 要展示的设备.
   */
  readonly device: DeviceSummary
  /**
   * 请求进入该设备的设置页.
   */
  readonly onOpen: (device: DeviceSummary) => void
  /**
   * 右上角的操作 (如开关机开关); 省略时不显示.
   */
  readonly action?: React.ReactNode
  /**
   * 卡片主体内容 (如当前状态摘要); 省略时不显示.
   */
  readonly children?: React.ReactNode
  /**
   * 卡片底部内容 (如预设快捷运行); 省略时不显示底栏.
   */
  readonly footer?: React.ReactNode
}

/**
 * 设备卡片: 名称, 在线状态与进入按钮, 并为右上角操作, 主体与底栏预留位置; 卡片高度由外部网格决定,
 * 主体占满剩余高度, 卡片声明为尺寸容器, 主体内容可随卡片尺寸缩放.
 * 进入按钮的点击区域铺满整张卡片, 点击卡片空白处即进入设置页; 放入的可交互元素需叠放在点击层之上.
 * 悬停时边框加深, 卡片轻微上移, 箭头轻推; 按下时卡片回落; 键盘聚焦时卡片显示聚焦环.
 * @param props 组件属性.
 * @returns 卡片元素.
 */
export function DeviceCard({
  device,
  onOpen,
  action,
  children,
  footer
}: DeviceCardProps): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <Card className="relative block-full gap-4 container-size transition duration-200 ease-out hover:ring-foreground/20 has-focus-visible:ring-ring motion-safe:hover:-translate-y-0.5 motion-safe:has-active:translate-y-0">
      <CardHeader>
        <CardTitle className="flex min-inline-0 items-center gap-1">
          <span className="truncate">{device.name}</span>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={t('devices.openSettings', { name: device.name })}
            onClick={() => onOpen(device)}
            className="shrink-0 text-muted-foreground after:absolute after:inset-0 focus-visible:ring-0 active:translate-none!"
          >
            <ChevronRight
              aria-hidden
              className="transition-transform duration-150 ease-out motion-safe:group-hover/card:translate-x-0.5"
            />
          </Button>
        </CardTitle>
        <CardDescription className="flex items-center gap-1.5 text-xs">
          <span
            aria-hidden
            className={cn(
              'block-1.5 inline-1.5 rounded-full',
              device.isOnline ? 'bg-primary' : 'bg-muted-foreground/40'
            )}
          />
          {device.isOnline ? t('devices.online') : t('devices.offline')}
        </CardDescription>
        {action !== undefined && <CardAction>{action}</CardAction>}
      </CardHeader>
      {children !== undefined && (
        <CardContent className="min-block-0 flex-1">{children}</CardContent>
      )}
      {footer !== undefined && <CardFooter className="block">{footer}</CardFooter>}
    </Card>
  )
}
