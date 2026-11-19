import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, RefreshCw, Settings2 } from 'lucide-react'
import { cn } from 'cn'

import { MessageAlert } from '@renderer/components/message-alert'
import { Button } from '@renderer/components/ui/button'
import { DropdownMenuItem } from '@renderer/components/ui/dropdown-menu'
import { Spinner } from '@renderer/components/ui/spinner'

import { AirflowControl } from './airflow-control'
import { AirflowDirectionControl } from './airflow-direction-control'
import { ClimatePanel } from './climate-panel'
import { getControlAvailability } from './control-availability'
import { FanControl } from './fan-control'
import { FunctionControl } from './function-control'
import { PresetManagerDialog } from './preset-manager-dialog'
import { PresetRunMenu } from './preset-run-menu'
import { useAirConditioner, type AirConditionerFailure } from './use-air-conditioner'
import { usePresets } from './use-presets'

/**
 * AirConditionerPage 的属性.
 */
interface AirConditionerPageProps {
  /**
   * 设备唯一标识.
   */
  readonly applianceCode: string
  /**
   * 设备名称; 未知时显示通用名称.
   */
  readonly deviceName?: string
  /**
   * 返回空调列表.
   */
  readonly onBack: () => void
  /**
   * 登录会话失效且无法续期时的回调, 参数为云端原因.
   */
  readonly onSessionExpired: (cloudMessage: string | undefined) => void
}

/**
 * 各失败操作在云端未给出原因时显示的通用文案的 i18n 键.
 */
const FAILURE_FALLBACK_KEYS = {
  load: 'airConditioner.loadFailed',
  control: 'airConditioner.controlFailed',
  applyPreset: 'airConditioner.presets.applyFailed'
} as const satisfies Record<AirConditionerFailure['operation'], string>

/**
 * 空调设置页: 顶部固定为返回, 名称, 室内温度, "运行预设" 下拉 (含管理预设) 与刷新;
 * 下方两栏铺满窗口不滚动: 左栏为主控面板 (电源, 圆弧温度, 模式), 右栏依次为风速, 出风, 风向与功能面板,
 * 风向面板吸收多余高度; 矮窗口下右栏各面板自动收紧尺寸. 进入时自动同步状态; 控件是否可用由互斥规则决定; 应用预设后以返回的状态刷新各面板.
 * 进入动画只作用于内容层, 外层裁剪溢出.
 * @param props 组件属性.
 * @returns 页面元素.
 */
export function AirConditionerPage({
  applianceCode,
  deviceName,
  onBack,
  onSessionExpired
}: AirConditionerPageProps): React.JSX.Element {
  const { t } = useTranslation()
  const { status, isLoading, isControlling, failure, refresh, control, applyPreset } =
    useAirConditioner(applianceCode, onSessionExpired)
  const presets = usePresets(applianceCode)
  const [isManagingPresets, setIsManagingPresets] = useState(false)
  const availability = status === undefined ? undefined : getControlAvailability(status)
  const isBusy = isLoading || isControlling

  return (
    <div className="block-full overflow-clip">
      <div className="flex block-full flex-col gap-3 px-6 pbs-5 pbe-6 duration-200 ease-out animate-in fade-in motion-safe:slide-in-from-end-4">
        <div className="flex shrink-0 items-center justify-between gap-4">
          <div className="flex min-inline-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('airConditioner.back')}
              onClick={onBack}
            >
              <ArrowLeft
                aria-hidden
                className="transition-transform duration-150 ease-out motion-safe:group-hover/button:-translate-x-0.5"
              />
            </Button>
            <div className="flex min-inline-0 flex-col gap-0.5">
              <h1 className="truncate text-lg font-medium text-foreground">
                {deviceName || t('airConditioner.fallbackName')}
              </h1>
              <p className="flex min-block-5 items-center gap-1.5 text-sm text-muted-foreground">
                {isControlling ? (
                  <>
                    <Spinner aria-hidden />
                    {t('airConditioner.applying')}
                  </>
                ) : status?.indoorTemperature !== undefined ? (
                  t('airConditioner.indoorTemperature', { value: status.indoorTemperature })
                ) : null}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PresetRunMenu
              presets={presets.presets}
              isDisabled={status === undefined || isBusy}
              isRunning={isControlling}
              onApply={(preset) => void applyPreset(preset)}
            >
              <DropdownMenuItem onSelect={() => setIsManagingPresets(true)}>
                <Settings2 aria-hidden />
                {t('airConditioner.presets.manage')}
              </DropdownMenuItem>
            </PresetRunMenu>
            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={isBusy}>
              <RefreshCw aria-hidden className={cn(isLoading && 'motion-safe:animate-spin')} />
              {isLoading ? t('airConditioner.refreshing') : t('airConditioner.refresh')}
            </Button>
          </div>
        </div>
        {failure !== undefined && (
          <MessageAlert
            tone="error"
            message={failure.cloudMessage ?? t(FAILURE_FALLBACK_KEYS[failure.operation])}
          />
        )}
        {status === undefined && isLoading && (
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner aria-hidden />
            {t('airConditioner.loading')}
          </div>
        )}
        {status !== undefined && availability !== undefined && (
          <div
            className={cn(
              'grid min-block-0 flex-1 grid-cols-11 gap-3 transition-opacity duration-200 ease-out',
              isLoading && 'opacity-60'
            )}
            aria-busy={isBusy}
          >
            <ClimatePanel
              status={status}
              availability={availability}
              onChange={(change) => void control(change)}
              className="col-span-5"
            />
            <div className="col-span-6 flex min-block-0 flex-col gap-3 short:gap-2">
              <FanControl
                fanSpeed={status.fanSpeed}
                canToggleAuto={availability.canToggleAutoFanSpeed}
                canSetSpeed={availability.canSetFanSpeed}
                onChange={(fanSpeed) => void control({ fanSpeed })}
              />
              <AirflowControl
                status={status}
                availability={availability}
                onChange={(change) => void control(change)}
              />
              <AirflowDirectionControl
                status={status}
                availability={availability}
                onChange={(change) => void control(change)}
                className="flex-1"
              />
              <FunctionControl
                status={status}
                availability={availability}
                onChange={(change) => void control(change)}
              />
            </div>
          </div>
        )}
      </div>
      <PresetManagerDialog
        isOpen={isManagingPresets}
        onOpenChange={setIsManagingPresets}
        controller={presets}
        isBusy={isBusy}
        onApply={(preset) => void applyPreset(preset)}
      />
    </div>
  )
}
