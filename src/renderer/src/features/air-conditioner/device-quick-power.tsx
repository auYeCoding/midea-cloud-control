import { useTranslation } from 'react-i18next'

import { Switch } from '@renderer/components/ui/switch'

import type { DeviceQuickControls } from './use-device-quick-controls'

/**
 * DeviceQuickPower 的属性.
 */
interface DeviceQuickPowerProps {
  /**
   * 这台空调的快捷控制.
   */
  readonly controls: DeviceQuickControls
  /**
   * 设备名称, 用于开关的无障碍名称.
   */
  readonly deviceName: string
}

/**
 * 设备卡片右上角的开关机开关; 尚未同步到状态, 或同步, 下发进行中时不可操作.
 * 叠放在卡片的整卡点击层之上, 点击开关不会进入设置页.
 * @param props 组件属性.
 * @returns 开关元素.
 */
export function DeviceQuickPower({
  controls,
  deviceName
}: DeviceQuickPowerProps): React.JSX.Element {
  const { t } = useTranslation()
  const { status, isLoading, isControlling, control } = controls.airConditioner

  return (
    <Switch
      checked={status?.isPoweredOn ?? false}
      disabled={status === undefined || isLoading || isControlling}
      onCheckedChange={(isPoweredOn) => void control({ isPoweredOn })}
      aria-label={t('airConditioner.quick.power', { name: deviceName })}
      className="relative z-10 motion-safe:active:scale-95"
    />
  )
}
