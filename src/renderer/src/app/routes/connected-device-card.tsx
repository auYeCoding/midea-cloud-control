import { useTranslation } from 'react-i18next'

import {
  DeviceQuickPower,
  DeviceQuickPresets,
  DeviceQuickStatus,
  useDeviceQuickControls
} from '@renderer/features/air-conditioner'
import { DeviceCard } from '@renderer/features/devices'

import type { DeviceSummary } from '../../../../shared/devices'

/**
 * ConnectedDeviceCard 的属性.
 */
interface ConnectedDeviceCardProps {
  /**
   * 要展示的设备.
   */
  readonly device: DeviceSummary
  /**
   * 请求进入该设备的设置页.
   */
  readonly onOpen: (device: DeviceSummary) => void
  /**
   * 登录状态失效时的处理.
   */
  readonly onSessionExpired: (cloudMessage: string | undefined) => void
}

/**
 * 在线设备的卡片: 同步空调状态与预设列表, 显示状态摘要, 右上角开关机与底部预设快捷运行.
 * @param props 组件属性.
 * @returns 卡片元素.
 */
function OnlineDeviceCard({
  device,
  onOpen,
  onSessionExpired
}: ConnectedDeviceCardProps): React.JSX.Element {
  const controls = useDeviceQuickControls(device.applianceCode, onSessionExpired)

  return (
    <DeviceCard
      device={device}
      onOpen={onOpen}
      action={<DeviceQuickPower controls={controls} deviceName={device.name} />}
      footer={<DeviceQuickPresets controls={controls} />}
    >
      <DeviceQuickStatus controls={controls} />
    </DeviceCard>
  )
}

/**
 * 设备列表中的一张卡片: 在线设备接入实时状态与快捷控制; 离线设备不发起查询, 只显示离线提示.
 * @param props 组件属性.
 * @returns 卡片元素.
 */
export function ConnectedDeviceCard(props: ConnectedDeviceCardProps): React.JSX.Element {
  const { t } = useTranslation()

  if (props.device.isOnline) {
    return <OnlineDeviceCard {...props} />
  }
  return (
    <DeviceCard device={props.device} onOpen={props.onOpen}>
      <p className="flex block-full items-center text-sm text-muted-foreground">
        {t('devices.offlineHint')}
      </p>
    </DeviceCard>
  )
}
