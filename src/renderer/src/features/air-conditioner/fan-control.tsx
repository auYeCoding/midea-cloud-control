import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Wind } from 'lucide-react'
import { cn } from 'cn'

import { Label } from '@renderer/components/ui/label'
import { Slider } from '@renderer/components/ui/slider'
import { Switch } from '@renderer/components/ui/switch'

import { FAN_SPEED_AUTO, FAN_SPEED_RANGE, type FanSpeed } from '../../../../shared/air-conditioner'
import { SettingsPanel } from './settings-panel'
import { StepButton } from './step-button'
import { useDebouncedStepper } from './use-debounced-stepper'
import { useSliderDraft } from './use-slider-draft'

/**
 * 风速加减按钮每次调整的百分比.
 */
const FAN_SPEED_BUTTON_STEP = 5

/**
 * FanControl 的属性.
 */
interface FanControlProps {
  /**
   * 当前风速.
   */
  readonly fanSpeed: FanSpeed
  /**
   * 能否开关自动风.
   */
  readonly canToggleAuto: boolean
  /**
   * 能否拖动风速滑块.
   */
  readonly canSetSpeed: boolean
  /**
   * 下发新的风速.
   */
  readonly onChange: (fanSpeed: FanSpeed) => void
}

/**
 * 风速面板: 标题行右侧为自动风开关; 内容为风速读数与夹在加减按钮之间的滑块, 拖动时只更新读数, 松手才下发,
 * 加减按钮每次 5%, 连点停顿后才下发;
 * 自动风开启时读数显示 "自动", 滑块置灰并停在关闭自动风时会下发的默认值.
 * @param props 组件属性.
 * @returns 面板元素.
 */
export function FanControl({
  fanSpeed,
  canToggleAuto,
  canSetSpeed,
  onChange
}: FanControlProps): React.JSX.Element {
  const { t } = useTranslation()
  const switchId = useId()
  const isAuto = fanSpeed === FAN_SPEED_AUTO
  const manualSpeed = isAuto ? FAN_SPEED_RANGE.DEFAULT : fanSpeed
  const speedStepper = useDebouncedStepper(
    manualSpeed,
    { min: FAN_SPEED_RANGE.MIN, max: FAN_SPEED_RANGE.MAX, step: FAN_SPEED_BUTTON_STEP },
    onChange
  )
  const { shownValue, handleValueChange, handleValueCommit } = useSliderDraft(
    speedStepper.shownValue,
    onChange
  )

  return (
    <SettingsPanel
      icon={Wind}
      title={t('airConditioner.fanSpeed')}
      action={
        <div className="flex items-center gap-2">
          <Label
            htmlFor={switchId}
            className={cn(
              'text-xs font-normal text-muted-foreground transition-opacity duration-200 ease-out',
              !canToggleAuto && 'opacity-50'
            )}
          >
            {t('airConditioner.autoFanSpeed')}
          </Label>
          <Switch
            id={switchId}
            size="sm"
            checked={isAuto}
            disabled={!canToggleAuto}
            onCheckedChange={(isChecked) => onChange(isChecked ? FAN_SPEED_AUTO : shownValue)}
            className="motion-safe:active:scale-95"
          />
        </div>
      }
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'min-inline-12 text-base font-medium text-foreground tabular-nums transition-opacity duration-200 ease-out',
            !canToggleAuto && 'opacity-50'
          )}
        >
          {isAuto
            ? t('airConditioner.fanSpeedAuto')
            : t('airConditioner.fanSpeedValue', { value: shownValue })}
        </span>
        <StepButton
          direction={-1}
          label={t('airConditioner.decreaseFanSpeed')}
          isEnabled={canSetSpeed && speedStepper.canDecrease}
          onStep={speedStepper.stepBy}
        />
        <Slider
          aria-label={t('airConditioner.fanSpeed')}
          min={FAN_SPEED_RANGE.MIN}
          max={FAN_SPEED_RANGE.MAX}
          step={FAN_SPEED_RANGE.STEP}
          value={[shownValue]}
          disabled={!canSetSpeed}
          onValueChange={handleValueChange}
          onValueCommit={handleValueCommit}
          className="flex-1 transition-opacity duration-200 ease-out"
        />
        <StepButton
          direction={1}
          label={t('airConditioner.increaseFanSpeed')}
          isEnabled={canSetSpeed && speedStepper.canIncrease}
          onStep={speedStepper.stepBy}
        />
      </div>
    </SettingsPanel>
  )
}
