import { useTranslation } from 'react-i18next'
import { cn } from 'cn'

import { Spinner } from '@renderer/components/ui/spinner'

import { MODE_ICONS } from './mode-icons'
import type { DeviceQuickControls } from './use-device-quick-controls'

/**
 * DeviceQuickStatus 的属性.
 */
interface DeviceQuickStatusProps {
  /**
   * 这台空调的快捷控制.
   */
  readonly controls: DeviceQuickControls
}

/**
 * 设备卡片的状态摘要: 设定温度 (大字, 随卡片尺寸缩放), 运行模式与室内温度, 贴卡片主体底部排列;
 * 关机时整体转为弱化色并标注已关机.
 * 首次同步中显示加载状态, 同步失败显示云端原因.
 * @param props 组件属性.
 * @returns 状态摘要元素.
 */
export function DeviceQuickStatus({ controls }: DeviceQuickStatusProps): React.JSX.Element {
  const { t } = useTranslation()
  const { status, isLoading, failure } = controls.airConditioner

  if (status === undefined) {
    return (
      <div className="flex block-full items-center gap-2 text-sm text-muted-foreground">
        {isLoading ? (
          <>
            <Spinner aria-hidden />
            {t('airConditioner.loading')}
          </>
        ) : (
          (failure?.cloudMessage ?? t('airConditioner.loadFailed'))
        )}
      </div>
    )
  }

  const ModeIcon = status.mode === undefined ? undefined : MODE_ICONS[status.mode]

  return (
    <div
      className={cn(
        'flex block-full items-end justify-between gap-4 transition-colors duration-300 ease-out',
        status.isPoweredOn ? 'text-foreground' : 'text-muted-foreground'
      )}
    >
      <div className="flex items-baseline gap-1">
        <span className="text-device-temperature leading-none font-medium tabular-nums">
          {status.targetTemperature.toFixed(1)}
        </span>
        <span className="text-sm text-muted-foreground">
          {t('airConditioner.quick.temperatureUnit')}
        </span>
      </div>
      <div className="flex flex-col items-end gap-1 text-sm">
        <span className="flex items-center gap-1.5">
          {status.isPoweredOn ? (
            <>
              {ModeIcon !== undefined && <ModeIcon aria-hidden className="block-4 inline-4" />}
              {status.mode === undefined
                ? t('airConditioner.quick.modeUnknown')
                : t(`airConditioner.modes.${status.mode}`)}
            </>
          ) : (
            t('airConditioner.poweredOff')
          )}
        </span>
        {status.indoorTemperature !== undefined && (
          <span className="text-xs text-muted-foreground">
            {t('airConditioner.indoorTemperature', { value: status.indoorTemperature })}
          </span>
        )}
      </div>
    </div>
  )
}
