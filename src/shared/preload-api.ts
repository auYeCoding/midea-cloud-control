import type { AirConditionerApi } from './air-conditioner'
import type { AirConditionerPresetsApi } from './air-conditioner-presets'
import type { AuthApi } from './auth'
import type { DevicesApi } from './devices'
import type { WindowControlsApi } from './window-controls'

/**
 * preload 经 contextBridge 暴露为 window.api 的项目自定义 API.
 */
export interface PreloadApi {
  /**
   * 窗口控制能力.
   */
  readonly windowControls: WindowControlsApi
  /**
   * 登录能力.
   */
  readonly auth: AuthApi
  /**
   * 设备能力.
   */
  readonly devices: DevicesApi
  /**
   * 空调状态同步与控制能力.
   */
  readonly airConditioner: AirConditionerApi
  /**
   * 空调预设的保存, 管理与应用能力.
   */
  readonly airConditionerPresets: AirConditionerPresetsApi
}
