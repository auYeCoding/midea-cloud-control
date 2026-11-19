import { useTranslation } from 'react-i18next'
import { Power } from 'lucide-react'

import { Toggle } from '@renderer/components/ui/toggle'

import type {
  AirConditionerControl,
  AirConditionerStatus
} from '../../../../shared/air-conditioner'
import { TARGET_TEMPERATURE_RANGE } from '../../../../shared/air-conditioner'
import type { ControlAvailability } from './control-availability'
import { ModeControl } from './mode-control'
import { SettingsPanel } from './settings-panel'
import { StepButton } from './step-button'
import { useDebouncedStepper } from './use-debounced-stepper'
import { TemperatureDial } from './temperature-dial'

/**
 * ClimatePanel 的属性.
 */
interface ClimatePanelProps {
  /**
   * 空调当前状态.
   */
  readonly status: AirConditionerStatus
  /**
   * 各控件是否可操作.
   */
  readonly availability: ControlAvailability
  /**
   * 下发一次控制.
   */
  readonly onChange: (control: AirConditionerControl) => void
  /**
   * 附加样式, 用于在页面网格中控制伸缩.
   */
  readonly className?: string
}

/**
 * 主控面板: 标题行右侧为开关机状态与圆形电源图标按钮 (开机时以主色填充), 中部为随面板缩放的圆弧温度滑块,
 * 圆弧底部缺口为加减按钮 (每次 0.5 度, 连点停顿后才下发), 底部为五种模式; 占满左栏高度.
 * @param props 组件属性.
 * @returns 面板元素.
 */
export function ClimatePanel({
  status,
  availability,
  onChange,
  className
}: ClimatePanelProps): React.JSX.Element {
  const { t } = useTranslation()
  const temperatureStepper = useDebouncedStepper(
    status.targetTemperature,
    {
      min: TARGET_TEMPERATURE_RANGE.MIN,
      max: TARGET_TEMPERATURE_RANGE.MAX,
      step: TARGET_TEMPERATURE_RANGE.STEP
    },
    (targetTemperature) => onChange({ targetTemperature })
  )

  return (
    <SettingsPanel
      title={t('airConditioner.power')}
      className={className}
      action={
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground" aria-hidden>
            {status.isPoweredOn ? t('airConditioner.poweredOn') : t('airConditioner.poweredOff')}
          </span>
          <Toggle
            pressed={status.isPoweredOn}
            disabled={!availability.canTogglePower}
            onPressedChange={(isPoweredOn) => onChange({ isPoweredOn })}
            aria-label={t('airConditioner.power')}
            className="block-8 inline-8 rounded-full bg-muted p-0 text-muted-foreground duration-200 ease-out aria-pressed:bg-primary! aria-pressed:text-primary-foreground! motion-safe:active:scale-90"
          >
            <Power aria-hidden />
          </Toggle>
        </div>
      }
    >
      <div className="flex min-block-0 flex-1 items-center justify-center">
        <TemperatureDial
          targetTemperature={temperatureStepper.shownValue}
          isEnabled={availability.canSetTemperature}
          onCommit={(targetTemperature) => onChange({ targetTemperature })}
          className="block-full inline-full"
          footer={
            <>
              <StepButton
                direction={-1}
                label={t('airConditioner.decreaseTemperature')}
                isEnabled={availability.canSetTemperature && temperatureStepper.canDecrease}
                onStep={temperatureStepper.stepBy}
              />
              <StepButton
                direction={1}
                label={t('airConditioner.increaseTemperature')}
                isEnabled={availability.canSetTemperature && temperatureStepper.canIncrease}
                onStep={temperatureStepper.stepBy}
              />
            </>
          }
        />
      </div>
      <ModeControl
        mode={status.mode}
        isEnabled={availability.canSetMode}
        onChange={(mode) => onChange({ mode })}
      />
    </SettingsPanel>
  )
}
