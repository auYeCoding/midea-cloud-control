import { useTranslation } from 'react-i18next'
import {
  DropletOff,
  Flame,
  LayoutGrid,
  Leaf,
  Lightbulb,
  Monitor,
  Thermometer,
  Volume2,
  Zap,
  type LucideIcon
} from 'lucide-react'

import type {
  AirConditionerControl,
  AirConditionerStatus
} from '../../../../shared/air-conditioner'
import type { ControlAvailability } from './control-availability'
import { IconToggleTile } from './icon-toggle-tile'
import { SettingsPanel } from './settings-panel'

/**
 * 一个功能开关的定义: 文案键, 图标, 读出开关状态与可用性, 生成控制.
 */
interface FunctionDefinition {
  /**
   * 文案键 (airConditioner 下).
   */
  readonly labelKey: string
  /**
   * 图标.
   */
  readonly icon: LucideIcon
  /**
   * 读出是否开启.
   * @param status 空调状态.
   * @returns 开启时为 true.
   */
  readonly isOn: (status: AirConditionerStatus) => boolean
  /**
   * 读出是否可操作.
   * @param availability 各控件可用性.
   * @returns 可操作时为 true.
   */
  readonly isEnabled: (availability: ControlAvailability) => boolean
  /**
   * 生成切换到目标状态的控制.
   * @param isOn 目标状态.
   * @returns 要下发的控制.
   */
  readonly toControl: (isOn: boolean) => AirConditionerControl
}

/**
 * 八个功能开关, 数组顺序即界面上的排列顺序 (4 列 2 行).
 */
const FUNCTIONS: readonly FunctionDefinition[] = [
  {
    labelKey: 'eco',
    icon: Leaf,
    isOn: (status) => status.isEco,
    isEnabled: (availability) => availability.canToggleEco,
    toControl: (isEco) => ({ isEco })
  },
  {
    labelKey: 'electricHeating',
    icon: Flame,
    isOn: (status) => status.isElectricHeating,
    isEnabled: (availability) => availability.canToggleElectricHeating,
    toControl: (isElectricHeating) => ({ isElectricHeating })
  },
  {
    labelKey: 'comfortPowerSave',
    icon: Zap,
    isOn: (status) => status.isComfortPowerSave,
    isEnabled: (availability) => availability.canToggleComfortPowerSave,
    toControl: (isComfortPowerSave) => ({ isComfortPowerSave })
  },
  {
    labelKey: 'intelligentControl',
    icon: Thermometer,
    isOn: (status) => status.isIntelligentControl === true,
    isEnabled: (availability) => availability.canToggleIntelligentControl,
    toControl: (isIntelligentControl) => ({ isIntelligentControl })
  },
  {
    labelKey: 'screenDisplay',
    icon: Monitor,
    isOn: (status) => status.isScreenDisplayOn,
    isEnabled: (availability) => availability.canToggleScreenDisplay,
    toControl: (isScreenDisplayOn) => ({ isScreenDisplayOn })
  },
  {
    labelKey: 'sound',
    icon: Volume2,
    isOn: (status) => status.isSoundOn,
    isEnabled: (availability) => availability.canToggleSound,
    toControl: (isSoundOn) => ({ isSoundOn })
  },
  {
    labelKey: 'antiMildew',
    icon: DropletOff,
    isOn: (status) => status.isAntiMildew,
    isEnabled: (availability) => availability.canToggleAntiMildew,
    toControl: (isAntiMildew) => ({ isAntiMildew })
  },
  {
    labelKey: 'lightSensitive',
    icon: Lightbulb,
    isOn: (status) => status.isLightSensitive === true,
    isEnabled: (availability) => availability.canToggleLightSensitive,
    toControl: (isLightSensitive) => ({ isLightSensitive })
  }
]

/**
 * FunctionControl 的属性.
 */
interface FunctionControlProps {
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
}

/**
 * 功能面板: 八个功能以图标方块开关排成 4 列 2 行; 不可用的功能按互斥规则置灰.
 * @param props 组件属性.
 * @returns 面板元素.
 */
export function FunctionControl({
  status,
  availability,
  onChange
}: FunctionControlProps): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <SettingsPanel icon={LayoutGrid} title={t('airConditioner.functions')}>
      <div className="grid grid-cols-4 gap-1.5">
        {FUNCTIONS.map(({ labelKey, icon: Icon, isOn, isEnabled, toControl }) => (
          <IconToggleTile
            key={labelKey}
            icon={<Icon aria-hidden className="block-4! inline-4!" />}
            label={t(`airConditioner.${labelKey}`)}
            isPressed={isOn(status)}
            isEnabled={isEnabled(availability)}
            onChange={(nextIsOn) => onChange(toControl(nextIsOn))}
          />
        ))}
      </div>
    </SettingsPanel>
  )
}
