import { useTranslation } from 'react-i18next'
import { ArrowDownUp } from 'lucide-react'

import type {
  AirConditionerControl,
  AirConditionerStatus
} from '../../../../shared/air-conditioner'
import { PreventStraightWindIcon, SwingLeftRightIcon, SwingUpDownIcon } from './airflow-icons'
import { getPreventStraightWindControl, type ControlAvailability } from './control-availability'
import { IconToggleTile } from './icon-toggle-tile'
import { SettingsPanel } from './settings-panel'

/**
 * AirflowControl 的属性.
 */
interface AirflowControlProps {
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
 * 出风面板: 防直吹, 上下摆风, 左右摆风三个图标方块开关; 开启防直吹时的联动由互斥规则生成.
 * @param props 组件属性.
 * @returns 面板元素.
 */
export function AirflowControl({
  status,
  availability,
  onChange
}: AirflowControlProps): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <SettingsPanel icon={ArrowDownUp} title={t('airConditioner.airflow')}>
      <div className="grid grid-cols-3 gap-2">
        <IconToggleTile
          icon={
            <PreventStraightWindIcon className="block-6! inline-6! short:block-5! short:inline-5!" />
          }
          label={t('airConditioner.preventStraightWind')}
          isPressed={status.isPreventStraightWind === true}
          isEnabled={availability.canTogglePreventStraightWind}
          onChange={(isPreventStraightWind) =>
            onChange(getPreventStraightWindControl(status, isPreventStraightWind))
          }
        />
        <IconToggleTile
          icon={<SwingUpDownIcon className="block-6! inline-6! short:block-5! short:inline-5!" />}
          label={t('airConditioner.swingUpDown')}
          isPressed={status.isSwingUpDown}
          isEnabled={availability.canToggleSwingUpDown}
          onChange={(isSwingUpDown) => onChange({ isSwingUpDown })}
        />
        <IconToggleTile
          icon={
            <SwingLeftRightIcon className="block-6! inline-6! short:block-5! short:inline-5!" />
          }
          label={t('airConditioner.swingLeftRight')}
          isPressed={status.isSwingLeftRight}
          isEnabled={availability.canToggleSwingLeftRight}
          onChange={(isSwingLeftRight) => onChange({ isSwingLeftRight })}
        />
      </div>
    </SettingsPanel>
  )
}
