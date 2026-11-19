import { useTranslation } from 'react-i18next'

import { PresetRunMenu } from './preset-run-menu'
import type { DeviceQuickControls } from './use-device-quick-controls'

/**
 * DeviceQuickPresets 的属性.
 */
interface DeviceQuickPresetsProps {
  /**
   * 这台空调的快捷控制.
   */
  readonly controls: DeviceQuickControls
}

/**
 * 读出卡片底部左侧的说明文字: 控制失败时为云端原因, 刚应用过预设时为预设名称, 否则为预设数量.
 * @param controls 这台空调的快捷控制.
 * @param translate 文案翻译函数.
 * @returns 说明文字.
 */
function describePresets(
  controls: DeviceQuickControls,
  translate: ReturnType<typeof useTranslation>['t']
): string {
  const { failure } = controls.airConditioner
  if (failure !== undefined && failure.operation !== 'load') {
    return failure.cloudMessage ?? translate('airConditioner.controlFailed')
  }
  if (controls.appliedPresetName !== undefined) {
    return translate('airConditioner.quick.presetApplied', { name: controls.appliedPresetName })
  }
  return translate('airConditioner.quick.presetCount', { count: controls.presets.length })
}

/**
 * 设备卡片底部的预设快捷运行: 左侧为状态说明, 右侧 "运行预设" 按钮展开预设列表, 选中即开机并应用整组参数.
 * 没有预设时列表给出提示; 尚未同步到状态, 或同步, 下发进行中时按钮不可操作.
 * 叠放在卡片的整卡点击层之上, 操作按钮不会进入设置页.
 * @param props 组件属性.
 * @returns 卡片底部元素.
 */
export function DeviceQuickPresets({ controls }: DeviceQuickPresetsProps): React.JSX.Element {
  const { t } = useTranslation()
  const { status, isLoading, isControlling, failure } = controls.airConditioner
  const isFailed = failure !== undefined && failure.operation !== 'load'

  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={
          isFailed
            ? 'min-inline-0 truncate text-xs text-destructive'
            : 'min-inline-0 truncate text-xs text-muted-foreground'
        }
      >
        {isControlling ? t('airConditioner.applying') : describePresets(controls, t)}
      </span>
      <PresetRunMenu
        presets={controls.presets}
        isDisabled={status === undefined || isLoading || isControlling}
        isRunning={isControlling}
        onApply={(preset) => void controls.applyPreset(preset)}
        className="relative z-10"
      />
    </div>
  )
}
