import { useState } from 'react'

import type { AirConditionerPreset } from '../../../../shared/air-conditioner-presets'
import { useAirConditioner, type AirConditionerController } from './use-air-conditioner'
import { usePresets } from './use-presets'

/**
 * 设备卡片快捷控制所需的状态与操作.
 */
export interface DeviceQuickControls {
  /**
   * 空调状态与控制, 与设置页共用同一套逻辑.
   */
  readonly airConditioner: AirConditionerController
  /**
   * 这台空调的预设列表.
   */
  readonly presets: readonly AirConditionerPreset[]
  /**
   * 最近一次在卡片上成功应用的预设名称; 尚未应用过时为 undefined.
   */
  readonly appliedPresetName?: string
  /**
   * 应用一套预设, 成功后记下其名称.
   */
  readonly applyPreset: (preset: AirConditionerPreset) => Promise<void>
}

/**
 * 为设备卡片同步一台空调的状态与预设列表, 并提供开关机与应用预设.
 * @param applianceCode 设备唯一标识.
 * @param onSessionExpired 登录状态失效时的处理.
 * @returns 快捷控制所需的状态与操作.
 */
export function useDeviceQuickControls(
  applianceCode: string,
  onSessionExpired: (cloudMessage: string | undefined) => void
): DeviceQuickControls {
  const airConditioner = useAirConditioner(applianceCode, onSessionExpired)
  const { presets } = usePresets(applianceCode)
  const [appliedPresetName, setAppliedPresetName] = useState<string>()

  const applyPreset = async (preset: AirConditionerPreset): Promise<void> => {
    setAppliedPresetName(undefined)
    if (await airConditioner.applyPreset(preset)) {
      setAppliedPresetName(preset.name)
    }
  }

  return { airConditioner, presets, appliedPresetName, applyPreset }
}
