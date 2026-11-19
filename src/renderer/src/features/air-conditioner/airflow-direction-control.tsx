import { useTranslation } from 'react-i18next'
import { Compass } from 'lucide-react'
import { cn } from 'cn'

import { ToggleGroup, ToggleGroupItem } from '@renderer/components/ui/toggle-group'

import {
  HORIZONTAL_AIRFLOW_DIRECTIONS,
  VERTICAL_AIRFLOW_DIRECTIONS,
  type AirConditionerControl,
  type AirConditionerStatus
} from '../../../../shared/air-conditioner'
import { AirflowDirectionIcon, type AirflowAxis } from './airflow-icons'
import {
  getHorizontalAirflowDirectionControl,
  getVerticalAirflowDirectionControl,
  type ControlAvailability
} from './control-availability'
import { SettingsPanel } from './settings-panel'

/**
 * DirectionRow 的属性.
 */
interface DirectionRowProps<T extends string> {
  /**
   * 风向轴, 决定图标朝向.
   */
  readonly axis: AirflowAxis
  /**
   * 单选组的无障碍名称.
   */
  readonly label: string
  /**
   * 行首显示的短标签.
   */
  readonly shortLabel: string
  /**
   * 档位选项, 顺序即排列顺序.
   */
  readonly options: readonly T[]
  /**
   * 当前档位; 不在选项内时不选中任何一档.
   */
  readonly value?: T
  /**
   * 是否可操作.
   */
  readonly isEnabled: boolean
  /**
   * 读出档位的无障碍名称.
   */
  readonly getOptionLabel: (option: T) => string
  /**
   * 选中另一档时的回调.
   */
  readonly onChange: (option: T) => void
}

/**
 * 一行风向档位: 行标签与五个固定高度的图标单选按钮, 选中档转为强调色并带浅色底; 行在面板内垂直居中.
 * @param props 组件属性.
 * @returns 行元素.
 */
function DirectionRow<T extends string>({
  axis,
  label,
  shortLabel,
  options,
  value,
  isEnabled,
  getOptionLabel,
  onChange
}: DirectionRowProps<T>): React.JSX.Element {
  const handleValueChange = (nextValue: string): void => {
    const option = options.find((candidate) => candidate === nextValue)
    if (option !== undefined && option !== value) {
      onChange(option)
    }
  }

  return (
    <div className="flex min-block-0 flex-1 items-center gap-2">
      <span
        className={cn(
          'shrink-0 text-xs text-muted-foreground transition-opacity duration-200 ease-out',
          !isEnabled && 'opacity-50'
        )}
        aria-hidden
      >
        {shortLabel}
      </span>
      <ToggleGroup
        type="single"
        spacing={1}
        value={value ?? ''}
        disabled={!isEnabled}
        onValueChange={handleValueChange}
        aria-label={label}
        className="grid flex-1 grid-cols-5"
      >
        {options.map((option, index) => (
          <ToggleGroupItem
            key={option}
            value={option}
            aria-label={getOptionLabel(option)}
            className="block-12 short:block-9 text-muted-foreground duration-200 ease-out aria-checked:bg-emphasis-muted! aria-checked:text-emphasis motion-safe:active:scale-95"
          >
            <AirflowDirectionIcon
              axis={axis}
              level={index}
              className="block-10! inline-10! short:block-8! short:inline-8!"
            />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}

/**
 * AirflowDirectionControl 的属性.
 */
interface AirflowDirectionControlProps {
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
 * 风向面板: 上下与左右各一行五档图标按钮; 摆风开启时选档的联动由互斥规则生成.
 * @param props 组件属性.
 * @returns 面板元素.
 */
export function AirflowDirectionControl({
  status,
  availability,
  onChange,
  className
}: AirflowDirectionControlProps): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <SettingsPanel
      icon={Compass}
      title={t('airConditioner.airflowDirection')}
      className={className}
    >
      <div className="flex min-block-0 flex-1 flex-col gap-1">
        <DirectionRow
          axis="vertical"
          label={t('airConditioner.verticalAirflowDirection')}
          shortLabel={t('airConditioner.verticalShort')}
          options={VERTICAL_AIRFLOW_DIRECTIONS}
          value={status.verticalAirflowDirection}
          isEnabled={availability.canSetVerticalAirflowDirection}
          getOptionLabel={(direction) => t(`airConditioner.verticalAirflowDirections.${direction}`)}
          onChange={(direction) => onChange(getVerticalAirflowDirectionControl(status, direction))}
        />
        <DirectionRow
          axis="horizontal"
          label={t('airConditioner.horizontalAirflowDirection')}
          shortLabel={t('airConditioner.horizontalShort')}
          options={HORIZONTAL_AIRFLOW_DIRECTIONS}
          value={status.horizontalAirflowDirection}
          isEnabled={availability.canSetHorizontalAirflowDirection}
          getOptionLabel={(direction) =>
            t(`airConditioner.horizontalAirflowDirections.${direction}`)
          }
          onChange={(direction) =>
            onChange(getHorizontalAirflowDirectionControl(status, direction))
          }
        />
      </div>
    </SettingsPanel>
  )
}
