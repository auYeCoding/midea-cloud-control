import {
  FAN_SPEED_AUTO,
  type AirConditionerControl,
  type AirConditionerMode,
  type AirConditionerStatus,
  type HorizontalAirflowDirection,
  type VerticalAirflowDirection
} from '../../../../shared/air-conditioner'

/**
 * 设置页各控件当前是否可操作.
 */
export interface ControlAvailability {
  /**
   * 开关机.
   */
  readonly canTogglePower: boolean
  /**
   * 设定温度.
   */
  readonly canSetTemperature: boolean
  /**
   * 切换模式.
   */
  readonly canSetMode: boolean
  /**
   * 开关自动风.
   */
  readonly canToggleAutoFanSpeed: boolean
  /**
   * 拖动风速滑块.
   */
  readonly canSetFanSpeed: boolean
  /**
   * 开关防直吹.
   */
  readonly canTogglePreventStraightWind: boolean
  /**
   * 开关上下摆风.
   */
  readonly canToggleSwingUpDown: boolean
  /**
   * 开关左右摆风.
   */
  readonly canToggleSwingLeftRight: boolean
  /**
   * 选上下风向档位.
   */
  readonly canSetVerticalAirflowDirection: boolean
  /**
   * 选左右风向档位.
   */
  readonly canSetHorizontalAirflowDirection: boolean
  /**
   * 开关节能.
   */
  readonly canToggleEco: boolean
  /**
   * 开关电辅热.
   */
  readonly canToggleElectricHeating: boolean
  /**
   * 开关舒适省电.
   */
  readonly canToggleComfortPowerSave: boolean
  /**
   * 开关智能控温.
   */
  readonly canToggleIntelligentControl: boolean
  /**
   * 开关屏幕显示.
   */
  readonly canToggleScreenDisplay: boolean
  /**
   * 开关声音.
   */
  readonly canToggleSound: boolean
  /**
   * 开关干燥防霉.
   */
  readonly canToggleAntiMildew: boolean
  /**
   * 开关智能光感.
   */
  readonly canToggleLightSensitive: boolean
}

/**
 * 规则 4: 电辅热可用的模式 (用户 2026-11-18 选定仅制热).
 */
const ELECTRIC_HEATING_MODES: readonly AirConditionerMode[] = ['heat']

/**
 * 规则 6: 节能与舒适省电可用的模式.
 */
const POWER_SAVING_MODES: readonly AirConditionerMode[] = ['cool']

/**
 * 规则 6: 干燥防霉可用的模式.
 */
const ANTI_MILDEW_MODES: readonly AirConditionerMode[] = ['cool', 'dry']

/**
 * 判断当前模式是否在允许的模式之内; 模式未知 (五种之外) 时视为不允许.
 * @param mode 当前模式.
 * @param allowedModes 允许的模式.
 * @returns 在允许的模式之内时返回 true.
 */
function isModeAllowed(
  mode: AirConditionerMode | undefined,
  allowedModes: readonly AirConditionerMode[]
): boolean {
  return mode !== undefined && allowedModes.includes(mode)
}

/**
 * 按需求中的互斥规则判定控件是否可用, 是这些规则在设置页中的唯一定义:
 * 规则 1, 关机时只有开关可用;
 * 规则 2, 摆风开启时该方向的风向档位仍可选, 选档时的联动见 getVerticalAirflowDirectionControl
 * 与 getHorizontalAirflowDirectionControl;
 * 规则 3, 防直吹开启时, 上下摆风与上下风向不可操作; 开启防直吹时的联动见 getPreventStraightWindControl;
 * 规则 4, 电辅热只在制热模式可用;
 * 规则 5, 送风模式下不能设定温度;
 * 规则 6, 节能与舒适省电只在制冷模式可用, 干燥防霉只在制冷与抽湿模式可用;
 * 规则 7, 自动风开启时风速滑块不可拖动.
 * 规则 4, 6 只置灰, 切换模式时不关闭这些功能 (与美居 App 一致).
 * @param status 空调状态.
 * @returns 各控件是否可操作.
 */
export function getControlAvailability(status: AirConditionerStatus): ControlAvailability {
  const { isPoweredOn, mode } = status
  const isPreventStraightWind = status.isPreventStraightWind === true
  return {
    canTogglePower: true,
    canSetTemperature: isPoweredOn && status.mode !== 'fan',
    canSetMode: isPoweredOn,
    canToggleAutoFanSpeed: isPoweredOn,
    canSetFanSpeed: isPoweredOn && status.fanSpeed !== FAN_SPEED_AUTO,
    canTogglePreventStraightWind: isPoweredOn,
    canToggleSwingUpDown: isPoweredOn && !isPreventStraightWind,
    canToggleSwingLeftRight: isPoweredOn,
    canSetVerticalAirflowDirection: isPoweredOn && !isPreventStraightWind,
    canSetHorizontalAirflowDirection: isPoweredOn,
    canToggleEco: isPoweredOn && isModeAllowed(mode, POWER_SAVING_MODES),
    canToggleElectricHeating: isPoweredOn && isModeAllowed(mode, ELECTRIC_HEATING_MODES),
    canToggleComfortPowerSave: isPoweredOn && isModeAllowed(mode, POWER_SAVING_MODES),
    canToggleIntelligentControl: isPoweredOn,
    canToggleScreenDisplay: isPoweredOn,
    canToggleSound: isPoweredOn,
    canToggleAntiMildew: isPoweredOn && isModeAllowed(mode, ANTI_MILDEW_MODES),
    canToggleLightSensitive: isPoweredOn
  }
}

/**
 * 按规则 3 生成开关防直吹的控制: 开启防直吹时若上下摆风开着, 同一次控制里关闭上下摆风,
 * 避免上下摆风开着却因置灰无法关闭.
 * @param status 空调状态.
 * @param isPreventStraightWind 开启 (true) 或关闭 (false) 防直吹.
 * @returns 要下发的控制.
 */
export function getPreventStraightWindControl(
  status: AirConditionerStatus,
  isPreventStraightWind: boolean
): AirConditionerControl {
  return isPreventStraightWind && status.isSwingUpDown
    ? { isPreventStraightWind, isSwingUpDown: false }
    : { isPreventStraightWind }
}

/**
 * 按规则 2 生成选上下风向档位的控制: 上下摆风开启时, 同一次控制里关闭上下摆风并设置该档.
 * @param status 空调状态.
 * @param verticalAirflowDirection 选中的档位.
 * @returns 要下发的控制.
 */
export function getVerticalAirflowDirectionControl(
  status: AirConditionerStatus,
  verticalAirflowDirection: VerticalAirflowDirection
): AirConditionerControl {
  return status.isSwingUpDown
    ? { verticalAirflowDirection, isSwingUpDown: false }
    : { verticalAirflowDirection }
}

/**
 * 按规则 2 生成选左右风向档位的控制: 左右摆风开启时, 同一次控制里关闭左右摆风并设置该档.
 * @param status 空调状态.
 * @param horizontalAirflowDirection 选中的档位.
 * @returns 要下发的控制.
 */
export function getHorizontalAirflowDirectionControl(
  status: AirConditionerStatus,
  horizontalAirflowDirection: HorizontalAirflowDirection
): AirConditionerControl {
  return status.isSwingLeftRight
    ? { horizontalAirflowDirection, isSwingLeftRight: false }
    : { horizontalAirflowDirection }
}
