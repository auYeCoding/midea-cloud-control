import { useTranslation } from 'react-i18next'

import { ToggleGroup, ToggleGroupItem } from '@renderer/components/ui/toggle-group'

import { AIR_CONDITIONER_MODES, type AirConditionerMode } from '../../../../shared/air-conditioner'
import { MODE_ICONS } from './mode-icons'

/**
 * 判断字符串是否为设置页模式.
 * @param value 待判断的值.
 * @returns 是五种模式之一时返回 true.
 */
function isAirConditionerMode(value: string): value is AirConditionerMode {
  return (AIR_CONDITIONER_MODES as readonly string[]).includes(value)
}

/**
 * ModeControl 的属性.
 */
interface ModeControlProps {
  /**
   * 当前模式; 空调处于五种模式之外时为 undefined, 此时不高亮任何选项.
   */
  readonly mode?: AirConditionerMode
  /**
   * 模式选项是否可操作.
   */
  readonly isEnabled: boolean
  /**
   * 请求切换到新模式.
   */
  readonly onChange: (mode: AirConditionerMode) => void
}

/**
 * 模式选择: 五个带图标的单选项排成一行, 当前模式以主色填充.
 * @param props 组件属性.
 * @returns 单选组元素.
 */
export function ModeControl({ mode, isEnabled, onChange }: ModeControlProps): React.JSX.Element {
  const { t } = useTranslation()

  const handleValueChange = (value: string): void => {
    if (isAirConditionerMode(value) && value !== mode) {
      onChange(value)
    }
  }

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={1}
      value={mode ?? ''}
      disabled={!isEnabled}
      onValueChange={handleValueChange}
      aria-label={t('airConditioner.mode')}
      className="grid inline-full grid-cols-5"
    >
      {AIR_CONDITIONER_MODES.map((option) => {
        const Icon = MODE_ICONS[option]
        return (
          <ToggleGroupItem
            key={option}
            value={option}
            className="min-inline-0 gap-1 px-1 duration-200 ease-out aria-checked:enabled:border-primary aria-checked:enabled:bg-primary aria-checked:enabled:text-primary-foreground motion-safe:active:scale-95"
          >
            <Icon aria-hidden />
            {t(`airConditioner.modes.${option}`)}
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}
