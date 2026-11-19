import type { CloudFailure } from './auth'

/**
 * 空调设置页相关的 IPC 通道名, 主进程与 preload 共用的唯一定义.
 */
export const AIR_CONDITIONER_CHANNELS = {
  GET_STATUS: 'air-conditioner:get-status',
  CONTROL: 'air-conditioner:control'
} as const

/**
 * 设置页可选的五种运行模式, 数组顺序即界面上的排列顺序.
 */
export const AIR_CONDITIONER_MODES = ['auto', 'cool', 'heat', 'dry', 'fan'] as const

/**
 * 空调运行模式: 自动, 制冷, 制热, 抽湿, 送风.
 */
export type AirConditionerMode = (typeof AIR_CONDITIONER_MODES)[number]

/**
 * 设定温度的取值范围与步进, 单位为摄氏度.
 */
export const TARGET_TEMPERATURE_RANGE = {
  /**
   * 可设定的最低温度.
   */
  MIN: 16,
  /**
   * 可设定的最高温度.
   */
  MAX: 30,
  /**
   * 调节步进.
   */
  STEP: 0.5
} as const

/**
 * 手动风速的取值范围与步进, 单位为百分比.
 */
export const FAN_SPEED_RANGE = {
  /**
   * 最低风速.
   */
  MIN: 1,
  /**
   * 最高风速.
   */
  MAX: 100,
  /**
   * 调节步进.
   */
  STEP: 1,
  /**
   * 关闭自动风时下发的默认风速, 与美居 App 一致.
   */
  DEFAULT: 80
} as const

/**
 * 表示自动风的风速取值.
 */
export const FAN_SPEED_AUTO = 'auto'

/**
 * 风速: 自动风, 或 FAN_SPEED_RANGE 范围内的百分比.
 */
export type FanSpeed = typeof FAN_SPEED_AUTO | number

/**
 * 上下风向的五个档位, 数组顺序即界面上从顶部到底部的排列顺序.
 */
export const VERTICAL_AIRFLOW_DIRECTIONS = ['top', 'upper', 'middle', 'lower', 'bottom'] as const

/**
 * 上下风向档位.
 */
export type VerticalAirflowDirection = (typeof VERTICAL_AIRFLOW_DIRECTIONS)[number]

/**
 * 左右风向的五个档位, 数组顺序即界面上从最左到最右的排列顺序.
 */
export const HORIZONTAL_AIRFLOW_DIRECTIONS = [
  'left',
  'leftCenter',
  'center',
  'rightCenter',
  'right'
] as const

/**
 * 左右风向档位.
 */
export type HorizontalAirflowDirection = (typeof HORIZONTAL_AIRFLOW_DIRECTIONS)[number]

/**
 * 设置页展示的空调当前状态.
 */
export interface AirConditionerStatus {
  /**
   * 是否处于开机状态.
   */
  readonly isPoweredOn: boolean
  /**
   * 设定温度, 摄氏度, 含 0.5 度.
   */
  readonly targetTemperature: number
  /**
   * 当前模式; 空调处于五种模式之外的模式 (如智能抽湿) 时为 undefined.
   */
  readonly mode?: AirConditionerMode
  /**
   * 室内温度, 摄氏度; 空调未上报有效值时为 undefined.
   */
  readonly indoorTemperature?: number
  /**
   * 风速: 自动风或百分比.
   */
  readonly fanSpeed: FanSpeed
  /**
   * 上下摆风是否开启.
   */
  readonly isSwingUpDown: boolean
  /**
   * 左右摆风是否开启.
   */
  readonly isSwingLeftRight: boolean
  /**
   * 防直吹是否开启; 空调未上报该属性时为 undefined.
   */
  readonly isPreventStraightWind?: boolean
  /**
   * 上下风向档位; 空调未上报或取值不在五档之内 (如自定义角度) 时为 undefined.
   */
  readonly verticalAirflowDirection?: VerticalAirflowDirection
  /**
   * 左右风向档位; 空调未上报或取值不在五档之内时为 undefined.
   */
  readonly horizontalAirflowDirection?: HorizontalAirflowDirection
  /**
   * 节能是否开启.
   */
  readonly isEco: boolean
  /**
   * 电辅热是否开启.
   */
  readonly isElectricHeating: boolean
  /**
   * 舒适省电是否开启.
   */
  readonly isComfortPowerSave: boolean
  /**
   * 智能控温是否开启; 空调未上报该属性时为 undefined.
   */
  readonly isIntelligentControl?: boolean
  /**
   * 屏幕显示是否点亮.
   */
  readonly isScreenDisplayOn: boolean
  /**
   * 声音是否开启: 本应用为这台空调保存的本地设置 (不从空调回读), 决定每条控制是否让空调鸣响.
   */
  readonly isSoundOn: boolean
  /**
   * 干燥防霉是否开启.
   */
  readonly isAntiMildew: boolean
  /**
   * 智能光感是否开启; 空调未上报该属性时为 undefined.
   */
  readonly isLightSensitive?: boolean
}

/**
 * 一次控制要改变的设置; 只填要改的字段, 其余设置由主进程按空调当前状态原样保留.
 * 字段名与类型和 AirConditionerStatus 一一对应, 渲染进程可把控制直接叠加到状态上显示.
 */
export interface AirConditionerControl {
  /**
   * 开机 (true) 或关机 (false).
   */
  readonly isPoweredOn?: boolean
  /**
   * 新的设定温度, 摄氏度.
   */
  readonly targetTemperature?: number
  /**
   * 新的运行模式.
   */
  readonly mode?: AirConditionerMode
  /**
   * 新的风速: 自动风或百分比.
   */
  readonly fanSpeed?: FanSpeed
  /**
   * 开启 (true) 或关闭 (false) 上下摆风.
   */
  readonly isSwingUpDown?: boolean
  /**
   * 开启 (true) 或关闭 (false) 左右摆风.
   */
  readonly isSwingLeftRight?: boolean
  /**
   * 开启 (true) 或关闭 (false) 防直吹.
   */
  readonly isPreventStraightWind?: boolean
  /**
   * 新的上下风向档位.
   */
  readonly verticalAirflowDirection?: VerticalAirflowDirection
  /**
   * 新的左右风向档位.
   */
  readonly horizontalAirflowDirection?: HorizontalAirflowDirection
  /**
   * 开启 (true) 或关闭 (false) 节能.
   */
  readonly isEco?: boolean
  /**
   * 开启 (true) 或关闭 (false) 电辅热.
   */
  readonly isElectricHeating?: boolean
  /**
   * 开启 (true) 或关闭 (false) 舒适省电.
   */
  readonly isComfortPowerSave?: boolean
  /**
   * 开启 (true) 或关闭 (false) 智能控温.
   */
  readonly isIntelligentControl?: boolean
  /**
   * 点亮 (true) 或熄灭 (false) 屏幕显示.
   */
  readonly isScreenDisplayOn?: boolean
  /**
   * 开启 (true) 或关闭 (false) 声音: 更新本地设置, 并下发声音总开关同步设备端.
   */
  readonly isSoundOn?: boolean
  /**
   * 开启 (true) 或关闭 (false) 干燥防霉.
   */
  readonly isAntiMildew?: boolean
  /**
   * 开启 (true) 或关闭 (false) 智能光感.
   */
  readonly isLightSensitive?: boolean
}

/**
 * 控制失败的结果: 除云端原因外, 带主进程已知的空调最新状态. 一次控制分多步下发时,
 * 前几步已生效的变更反映在该状态中; 主进程尚无已知状态时为 undefined.
 */
export interface AirConditionerControlFailure extends CloudFailure {
  /**
   * 失败时主进程已知的空调最新状态.
   */
  readonly status?: AirConditionerStatus
}

/**
 * 查询状态或下发控制的结果; 成功时带空调的最新状态, 控制失败时可带已知的最新状态.
 */
export type AirConditionerStatusResult =
  { readonly ok: true; readonly status: AirConditionerStatus } | AirConditionerControlFailure

/**
 * preload 暴露给渲染进程的空调控制能力.
 */
export interface AirConditionerApi {
  /**
   * 从云端同步一台空调的当前状态.
   */
  readonly getStatus: (applianceCode: string) => Promise<AirConditionerStatusResult>
  /**
   * 向一台空调下发控制, 返回控制后的状态.
   */
  readonly control: (
    applianceCode: string,
    control: AirConditionerControl
  ) => Promise<AirConditionerStatusResult>
}
