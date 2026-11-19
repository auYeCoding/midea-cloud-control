import { useTranslation } from 'react-i18next'
import { LogOut, RefreshCw } from 'lucide-react'
import { cn } from 'cn'

import { MessageAlert } from '@renderer/components/message-alert'
import { Button } from '@renderer/components/ui/button'
import { Spinner } from '@renderer/components/ui/spinner'

import type { DeviceListResult, DeviceSummary } from '../../../../shared/devices'
import { MIN_CARD_HEIGHT, useFitGrid } from './use-fit-grid'

/**
 * DeviceListPage 的属性.
 */
interface DeviceListPageProps {
  /**
   * 最近一次拉取的结果.
   */
  readonly result: DeviceListResult
  /**
   * 是否正在重新拉取.
   */
  readonly isRefreshing: boolean
  /**
   * 请求重新拉取.
   */
  readonly onRefresh: () => void
  /**
   * 是否正在退出登录.
   */
  readonly isLoggingOut: boolean
  /**
   * 请求退出登录.
   */
  readonly onLogout: () => void
  /**
   * 渲染一台设备的卡片; 卡片内容由调用方组合 (如接入实时状态与快捷控制).
   */
  readonly renderDevice: (device: DeviceSummary) => React.ReactNode
}

/**
 * 设备列表页: 顶部标题栏 (空调总数, 刷新与退出登录按钮) 固定不动; 下方的卡片网格随窗口尺寸重新挑选
 * 列数与行数, 卡片铺满剩余区域而不产生滚动条, 只有卡片多到放不下时才按最小高度排列并滚动;
 * 拉取失败时显示错误提示. 进入动画只作用于内容层, 外层裁剪溢出, 使动画期间主区域不出现滚动条.
 * @param props 组件属性.
 * @returns 页面元素.
 */
export function DeviceListPage({
  result,
  isRefreshing,
  onRefresh,
  isLoggingOut,
  onLogout,
  renderDevice
}: DeviceListPageProps): React.JSX.Element {
  const { t } = useTranslation()
  const devices = result.ok ? result.devices : []
  const { containerRef, layout } = useFitGrid(devices.length)

  return (
    <div className="block-full overflow-clip">
      <div className="flex block-full flex-col duration-200 ease-out animate-in fade-in motion-safe:slide-in-from-bottom-2">
        <div className="flex shrink-0 items-center justify-between gap-4 px-6 pbs-6 pbe-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-medium text-foreground">{t('devices.title')}</h1>
            {result.ok && (
              <p className="text-sm text-muted-foreground">
                {t('devices.count', { count: devices.length })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onRefresh} disabled={isRefreshing || isLoggingOut}>
              <RefreshCw aria-hidden className={cn(isRefreshing && 'motion-safe:animate-spin')} />
              {isRefreshing ? t('devices.refreshing') : t('devices.refresh')}
            </Button>
            <Button
              variant="ghost"
              className="text-muted-foreground"
              onClick={onLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <Spinner aria-hidden />
              ) : (
                <LogOut
                  aria-hidden
                  className="transition-transform duration-150 ease-out motion-safe:group-hover/button:translate-x-0.5"
                />
              )}
              {isLoggingOut ? t('devices.loggingOut') : t('devices.logout')}
            </Button>
          </div>
        </div>
        <div
          ref={containerRef}
          className="flex min-block-0 flex-1 flex-col gap-4 overflow-y-auto px-6 pbs-1 pbe-6"
        >
          {!result.ok && (
            <MessageAlert tone="error" message={result.cloudMessage ?? t('devices.loadFailed')} />
          )}
          {result.ok && devices.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">{t('devices.empty')}</p>
          )}
          {devices.length > 0 && (
            <ul
              className={cn(
                'grid shrink-0 gap-4 transition-opacity duration-200 ease-out',
                layout.fits && 'block-full',
                isRefreshing && 'opacity-60'
              )}
              style={{
                gridTemplateColumns: `repeat(${String(layout.columns)}, minmax(0, 1fr))`,
                gridTemplateRows: layout.fits
                  ? `repeat(${String(layout.rows)}, minmax(0, 1fr))`
                  : undefined,
                gridAutoRows: layout.fits ? undefined : `${String(MIN_CARD_HEIGHT)}px`
              }}
              aria-busy={isRefreshing}
            >
              {devices.map((device) => (
                <li key={device.applianceCode}>{renderDevice(device)}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
