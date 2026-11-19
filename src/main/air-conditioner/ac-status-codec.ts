import {
  AIR_CONDITIONER_MODES,
  FAN_SPEED_AUTO,
  FAN_SPEED_RANGE,
  TARGET_TEMPERATURE_RANGE,
  type AirConditionerControl,
  type AirConditionerMode,
  type AirConditionerStatus,
  type FanSpeed
} from '../../shared/air-conditioner'
import { AC_MESSAGE_TYPES, type AcFrame } from './ac-frame'

/**
 * 基础状态回帧的命令字.
 */
const STATUS_COMMAND = 0xc0

/**
 * 基础状态查询的命令字.
 */
const QUERY_COMMAND = 0x41

/**
 * 基础状态控制的命令字.
 */
const CONTROL_COMMAND = 0x40

/**
 * 基础状态查询负载 (随机字节之前) 的字节数, 与 v96 版 Lua 查询分支 bodyBytes[0..19] 一致.
 */
const QUERY_PAYLOAD_LENGTH = 20

/**
 * 基础状态控制负载 (随机字节之前) 的字节数, 与 v96 版 Lua 0x40 分支 bodyBytes[0..23] 一致.
 */
const CONTROL_PAYLOAD_LENGTH = 24

/**
 * 屏幕显示切换帧负载 (随机字节之前) 的字节数, 与 v96 版 Lua screen_display 分支 bodyBytes[0..22] 一致.
 */
const SCREEN_DISPLAY_TOGGLE_PAYLOAD_LENGTH = 23

/**
 * 屏幕显示切换帧 body[1] 的取值: 带蜂鸣与不带蜂鸣, 与 v96 版 Lua screen_display 分支一致.
 */
const SCREEN_DISPLAY_TOGGLE_FLAGS = {
  /**
   * 切换时鸣响.
   */
  BUZZER_ON: 0xc1,
  /**
   * 切换时不鸣响.
   */
  BUZZER_OFF: 0x81
} as const

/**
 * 状态回帧中屏幕显示字段 (body[14] 的 bit4..6) 的掩码.
 */
const SCREEN_DISPLAY_MASK = 0x70

/**
 * 屏幕显示字段的右移位数.
 */
const SCREEN_DISPLAY_SHIFT = 4

/**
 * 屏幕显示字段中表示熄灭的值, 与 v96 版 Lua dataToJson (screenDisplayNowValue == 0x07 为 off) 一致.
 */
const SCREEN_DISPLAY_OFF_VALUE = 0x07

/**
 * 状态回帧消息体的最小字节数; 不足时 v96 版 Lua binToModel 不解码.
 */
const STATUS_BODY_MIN_LENGTH = 22

/**
 * 状态回帧消息体达到此字节数时才含舒适省电字段.
 */
const STATUS_BODY_COMFORT_POWER_SAVE_LENGTH = 25

/**
 * 模式与协议字节值的对应 (字节的高 3 位).
 */
const MODE_BYTES: Readonly<Record<AirConditionerMode, number>> = {
  auto: 0x20,
  cool: 0x40,
  dry: 0x60,
  heat: 0x80,
  fan: 0xa0
}

/**
 * 智能抽湿模式的字节值; 不在设置页五种模式之内, 仅需原样保留.
 */
const MODE_BYTE_SMART_DRY = 0xc0

/**
 * 模式所在位的掩码.
 */
const MODE_MASK = 0xe0

/**
 * 设定温度整数部分在协议中相对的基准值.
 */
const TEMPERATURE_BASE = 16

/**
 * 扩展温度字段相对的基准值.
 */
const EXTENDED_TEMPERATURE_BASE = 12

/**
 * 扩展温度字段的有效上限 (含).
 */
const EXTENDED_TEMPERATURE_FIELD_MAX = 25

/**
 * 控制帧中需要写扩展温度字段的温度阈值 (低于此值时写).
 */
const EXTENDED_TEMPERATURE_LOW_THRESHOLD = 17

/**
 * 风速字段中表示自动风的值 (0x66).
 */
const FAN_SPEED_AUTO_VALUE = 102

/**
 * 风速字段的取值范围, 与 v96 版 Lua checkBoundary(wind_speed, 1, 102) 一致.
 */
const FAN_SPEED_PROTOCOL_RANGE = { MIN: 1, MAX: FAN_SPEED_AUTO_VALUE } as const

/**
 * 由基础状态控制帧 (0x40) 承载的控制字段; 控制中含其中任一字段时才下发 0x40 帧.
 */
const STATUS_CONTROL_FIELDS = [
  'isPoweredOn',
  'targetTemperature',
  'mode',
  'fanSpeed',
  'isSwingUpDown',
  'isSwingLeftRight',
  'isEco',
  'isElectricHeating',
  'isComfortPowerSave',
  'isAntiMildew'
] as const satisfies readonly (keyof AirConditionerControl)[]

/**
 * 智能抽湿湿度的有效范围; 超出时按 Lua 默认值处理.
 */
const SMART_DRY_RANGE = { MIN: 30, MAX: 101 } as const

/**
 * 智能抽湿湿度的默认值, 与 v96 版 Lua setDefaultValue 一致.
 */
const SMART_DRY_DEFAULT = 50

/**
 * pmv 档位的上限, 对应 v96 版 Lua checkBoundary(pmv, -3.5, 3) 换算后的 (3 + 3.5) * 2.
 */
const PMV_LEVEL_MAX = 13

/**
 * 定时字段中表示定时关闭的值.
 */
const TIMER_DISABLED_BYTE = 0x7f

/**
 * 定时字段中表示定时开启的位.
 */
const TIMER_ENABLED_BIT = 0x80

/**
 * 一刻钟的分钟数, 定时以此为步进.
 */
const MINUTES_PER_STEP = 15

/**
 * 一小时的分钟数.
 */
const MINUTES_PER_HOUR = 60

/**
 * 舒适睡眠开启时写入的睡眠时长, 与 v96 版 Lua 一致.
 */
const COMFORT_SLEEP_TIME = 0x0a

/**
 * 舒适睡眠曲线温度的下限.
 */
const COMFORT_SLEEP_CURVE_MIN = 17

/**
 * 舒适睡眠曲线温度的上限.
 */
const COMFORT_SLEEP_CURVE_MAX = 30

/**
 * 室内温度字段的无效值.
 */
const INVALID_TEMPERATURE_BYTES: ReadonlySet<number> = new Set([0x00, 0xff])

/**
 * 室内温度字段的零点偏移.
 */
const INDOOR_TEMPERATURE_OFFSET = 50

/**
 * 控制帧各字节中固定写入的位.
 */
const CONTROL_FIXED_BITS = {
  /**
   * 手机端控制标记.
   */
  CLIENT_MOBILE: 0x02,
  /**
   * 蜂鸣位: 置位时这条指令让空调鸣响, 由调用方按本地声音设置决定是否置位.
   */
  BUZZER_ON: 0x40,
  /**
   * 摆风字节的固定位.
   */
  SWING_FIXED: 0x30,
  /**
   * 下左右摆风使能位, 状态中总带该字段, 故总是置位.
   */
  SWING_LEFT_RIGHT_UNDER_ENABLE: 0x80
} as const

/**
 * 一组定时设置.
 */
interface AcTimer {
  /**
   * 是否开启.
   */
  readonly isEnabled: boolean
  /**
   * 定时时长, 分钟; 未开启时为 0.
   */
  readonly minutes: number
}

/**
 * 主进程内保存的空调全量状态: 字段与 v96 版 Lua 中 0xC0 回帧经 dataToJson 与 jsonToModel(status)
 * 往返后进入 0x40 编码的 keyP 一一对应, 用于合成全量控制帧, 本切片不管的字段也原样保留.
 */
export interface AcProtocolState {
  /**
   * 是否开机.
   */
  readonly isPoweredOn: boolean
  /**
   * 模式字节值 (含设置页之外的模式).
   */
  readonly modeByte: number
  /**
   * 智能抽湿湿度.
   */
  readonly smartDryValue: number
  /**
   * 设定温度整数部分, 摄氏度; 解码值, 可能超出设置页范围.
   */
  readonly temperature: number
  /**
   * 设定温度是否带 0.5 度.
   */
  readonly hasHalfDegree: boolean
  /**
   * 风速, 1 到 102.
   */
  readonly fanSpeed: number
  /**
   * 定时开机.
   */
  readonly powerOnTimer: AcTimer
  /**
   * 定时关机.
   */
  readonly powerOffTimer: AcTimer
  /**
   * 强劲.
   */
  readonly isStrongWind: boolean
  /**
   * 省电.
   */
  readonly isPowerSaving: boolean
  /**
   * 舒适睡眠.
   */
  readonly isComfortSleep: boolean
  /**
   * 电辅热.
   */
  readonly isElectricHeating: boolean
  /**
   * 净化.
   */
  readonly isPurifier: boolean
  /**
   * 节能 (eco).
   */
  readonly isEco: boolean
  /**
   * 干燥.
   */
  readonly isDry: boolean
  /**
   * 左右摆风.
   */
  readonly isSwingLeftRight: boolean
  /**
   * 上下摆风.
   */
  readonly isSwingUpDown: boolean
  /**
   * 下左右摆风.
   */
  readonly isSwingLeftRightUnder: boolean
  /**
   * 防冷风.
   */
  readonly isPreventCold: boolean
  /**
   * 舒适省电.
   */
  readonly isComfortPowerSave: boolean
  /**
   * 自然风.
   */
  readonly isNaturalWind: boolean
  /**
   * pmv 档位, 0 到 13.
   */
  readonly pmvLevel: number
  /**
   * 屏幕显示是否点亮. 只用于展示与判断是否需要切换, 不参与 0x40 控制编码.
   */
  readonly isScreenDisplayOn: boolean
  /**
   * 室内温度, 摄氏度; 无效时为 undefined. 只用于展示, 不参与控制编码.
   */
  readonly indoorTemperature?: number
}

/**
 * 判断字节中某些位是否全部置位.
 * @param byte 字节.
 * @param bits 位掩码.
 * @returns 全部置位时返回 true.
 */
function hasBits(byte: number, bits: number): boolean {
  return (byte & bits) === bits
}

/**
 * 把数值限制在区间内.
 * @param value 数值.
 * @param min 下限.
 * @param max 上限.
 * @returns 限制后的数值.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * 解码定时字段, 与 v96 版 Lua binToModel 及 dataToJson 一致: 未开启时时长为 0.
 * @param timerByte 定时开关与小时字节.
 * @param minuteNibble 分钟字段 (4 位).
 * @returns 定时设置.
 */
function decodeTimer(timerByte: number, minuteNibble: number): AcTimer {
  if (!hasBits(timerByte, TIMER_ENABLED_BIT)) {
    return { isEnabled: false, minutes: 0 }
  }
  const hours = (timerByte & 0x7f) >> 2
  const steps = timerByte & 0x03
  const extraMinutes = MINUTES_PER_STEP - (minuteNibble & 0x0f)
  return {
    isEnabled: true,
    minutes: hours * MINUTES_PER_HOUR + steps * MINUTES_PER_STEP + extraMinutes
  }
}

/**
 * 解码设定温度整数部分, 与 v96 版 Lua 一致: 扩展温度字段有效时以它为准.
 * @param body 状态回帧消息体.
 * @returns 设定温度整数部分.
 */
function decodeTemperature(body: readonly number[]): number {
  const extended = body[13] & 0x1f
  if (extended > 0 && extended <= EXTENDED_TEMPERATURE_FIELD_MAX) {
    return extended + EXTENDED_TEMPERATURE_BASE
  }
  return (body[2] & 0x0f) + TEMPERATURE_BASE
}

/**
 * 解码室内温度, 与 v96 版 Lua dataToJson 一致: 整数部分取 (原值 - 50) / 2 向零取整, 小数位取 body[15] 低 4 位.
 * @param body 状态回帧消息体.
 * @returns 室内温度; 无效时返回 undefined.
 */
function decodeIndoorTemperature(body: readonly number[]): number | undefined {
  if (INVALID_TEMPERATURE_BYTES.has(body[11])) {
    return undefined
  }
  const value = (body[11] - INDOOR_TEMPERATURE_OFFSET) / 2
  const tenths = (body[15] & 0x0f) / 10
  const integer = Math.trunc(value)
  return value < 0 ? integer - tenths : integer + tenths
}

/**
 * 解码智能抽湿湿度; 不是智能抽湿模式或超出有效范围时取默认值.
 * @param modeByte 模式字节值.
 * @param body 状态回帧消息体.
 * @returns 智能抽湿湿度.
 */
function decodeSmartDryValue(modeByte: number, body: readonly number[]): number {
  const value = body[19] & 0x7f
  const isValid =
    modeByte === MODE_BYTE_SMART_DRY && value >= SMART_DRY_RANGE.MIN && value <= SMART_DRY_RANGE.MAX
  return isValid ? value : SMART_DRY_DEFAULT
}

/**
 * 把基础状态回帧 (0xC0) 解码为全量状态, 按 v96 版 Lua binToModel (报文类型 0x02 / 0x03 分支)
 * 与 dataToJson, jsonToModel(status) 的往返结果.
 * @param frame 已解析的回帧.
 * @returns 全量状态; 不是基础状态回帧或消息体过短时返回 undefined.
 */
export function decodeStatusFrame(frame: AcFrame): AcProtocolState | undefined {
  const { messageType, body } = frame
  const isStatusType =
    messageType === AC_MESSAGE_TYPES.CONTROL || messageType === AC_MESSAGE_TYPES.QUERY
  if (!isStatusType || body[0] !== STATUS_COMMAND || body.length < STATUS_BODY_MIN_LENGTH) {
    return undefined
  }
  const modeByte = body[2] & MODE_MASK
  return {
    isPoweredOn: hasBits(body[1], 0x01),
    modeByte,
    smartDryValue: decodeSmartDryValue(modeByte, body),
    temperature: decodeTemperature(body),
    hasHalfDegree: hasBits(body[2], 0x10),
    fanSpeed: clamp(body[3] & 0x7f, FAN_SPEED_PROTOCOL_RANGE.MIN, FAN_SPEED_PROTOCOL_RANGE.MAX),
    powerOnTimer: decodeTimer(body[4], body[6] >> 4),
    powerOffTimer: decodeTimer(body[5], body[6]),
    isStrongWind: hasBits(body[8], 0x20),
    isPowerSaving: hasBits(body[8], 0x08),
    isComfortSleep: hasBits(body[8], 0x03),
    isElectricHeating: hasBits(body[9], 0x08),
    isPurifier: hasBits(body[9], 0x20),
    isEco: hasBits(body[9], 0x10),
    isDry: hasBits(body[9], 0x04),
    isNaturalWind: hasBits(body[9], 0x02),
    isSwingLeftRight: hasBits(body[7], 0x03),
    isSwingUpDown: hasBits(body[7], 0x0c),
    isSwingLeftRightUnder: hasBits(body[20], 0x80),
    isPreventCold: hasBits(body[10], 0x20),
    isComfortPowerSave:
      body.length >= STATUS_BODY_COMFORT_POWER_SAVE_LENGTH && hasBits(body[22], 0x01),
    pmvLevel: Math.min(body[14] & 0x0f, PMV_LEVEL_MAX),
    isScreenDisplayOn:
      (body[14] & SCREEN_DISPLAY_MASK) >> SCREEN_DISPLAY_SHIFT !== SCREEN_DISPLAY_OFF_VALUE,
    indoorTemperature: decodeIndoorTemperature(body)
  }
}

/**
 * 由模式字节值反查设置页模式.
 * @param modeByte 模式字节值.
 * @returns 设置页模式; 不在五种模式之内时返回 undefined.
 */
function toAirConditionerMode(modeByte: number): AirConditionerMode | undefined {
  return AIR_CONDITIONER_MODES.find((mode) => MODE_BYTES[mode] === modeByte)
}

/**
 * 把风速字段值转换为设置页风速; 手动风速限制在设置页范围内.
 * @param fanSpeedValue 风速字段值.
 * @returns 设置页风速.
 */
function toFanSpeed(fanSpeedValue: number): FanSpeed {
  if (fanSpeedValue === FAN_SPEED_AUTO_VALUE) {
    return FAN_SPEED_AUTO
  }
  return clamp(fanSpeedValue, FAN_SPEED_RANGE.MIN, FAN_SPEED_RANGE.MAX)
}

/**
 * 把设置页风速编码为风速字段值; 手动风速按设置页范围与步进规整.
 * @param fanSpeed 设置页风速.
 * @returns 风速字段值.
 */
function toFanSpeedValue(fanSpeed: FanSpeed): number {
  if (fanSpeed === FAN_SPEED_AUTO) {
    return FAN_SPEED_AUTO_VALUE
  }
  return clamp(Math.round(fanSpeed), FAN_SPEED_RANGE.MIN, FAN_SPEED_RANGE.MAX)
}

/**
 * 把全量状态转换为设置页展示的状态中由基础状态帧承载的部分.
 * @param state 全量状态.
 * @returns 设置页状态的基础部分.
 */
export function toAirConditionerStatus(
  state: AcProtocolState
): Pick<
  AirConditionerStatus,
  | 'isPoweredOn'
  | 'targetTemperature'
  | 'mode'
  | 'indoorTemperature'
  | 'fanSpeed'
  | 'isSwingUpDown'
  | 'isSwingLeftRight'
  | 'isEco'
  | 'isElectricHeating'
  | 'isComfortPowerSave'
  | 'isScreenDisplayOn'
  | 'isAntiMildew'
> {
  return {
    isPoweredOn: state.isPoweredOn,
    targetTemperature:
      state.temperature + (state.hasHalfDegree ? TARGET_TEMPERATURE_RANGE.STEP : 0),
    mode: toAirConditionerMode(state.modeByte),
    indoorTemperature: state.indoorTemperature,
    fanSpeed: toFanSpeed(state.fanSpeed),
    isSwingUpDown: state.isSwingUpDown,
    isSwingLeftRight: state.isSwingLeftRight,
    isEco: state.isEco,
    isElectricHeating: state.isElectricHeating,
    isComfortPowerSave: state.isComfortPowerSave,
    isScreenDisplayOn: state.isScreenDisplayOn,
    isAntiMildew: state.isDry
  }
}

/**
 * 判断一次控制是否含由基础状态控制帧 (0x40) 承载的字段.
 * @param control 要改变的设置.
 * @returns 含任一基础状态字段时返回 true.
 */
export function hasStatusControl(control: AirConditionerControl): boolean {
  return STATUS_CONTROL_FIELDS.some((field) => control[field] !== undefined)
}

/**
 * 判断一次控制是否需要切换屏幕显示: 屏幕显示只能经切换帧翻转, 只有目标与当前状态不同时才切换.
 * @param state 当前全量状态.
 * @param control 要改变的设置.
 * @returns 需要下发切换帧时返回 true.
 */
export function shouldToggleScreenDisplay(
  state: AcProtocolState,
  control: AirConditionerControl
): boolean {
  return (
    control.isScreenDisplayOn !== undefined && control.isScreenDisplayOn !== state.isScreenDisplayOn
  )
}

/**
 * 在全量状态上应用一次控制, 只改控制中给出的字段; 设定温度按设置页范围与步进规整;
 * 开关节能时同帧同步省电 (power_saving), 与美居 App 开节能时同发两者一致.
 * @param state 当前全量状态.
 * @param control 要改变的设置.
 * @returns 新的全量状态.
 */
export function applyControl(
  state: AcProtocolState,
  control: AirConditionerControl
): AcProtocolState {
  const { MIN, MAX, STEP } = TARGET_TEMPERATURE_RANGE
  const temperature =
    control.targetTemperature === undefined
      ? undefined
      : clamp(Math.round(control.targetTemperature / STEP) * STEP, MIN, MAX)
  return {
    ...state,
    isPoweredOn: control.isPoweredOn ?? state.isPoweredOn,
    modeByte: control.mode === undefined ? state.modeByte : MODE_BYTES[control.mode],
    temperature: temperature === undefined ? state.temperature : Math.floor(temperature),
    hasHalfDegree:
      temperature === undefined ? state.hasHalfDegree : temperature !== Math.floor(temperature),
    fanSpeed: control.fanSpeed === undefined ? state.fanSpeed : toFanSpeedValue(control.fanSpeed),
    isSwingUpDown: control.isSwingUpDown ?? state.isSwingUpDown,
    isSwingLeftRight: control.isSwingLeftRight ?? state.isSwingLeftRight,
    isEco: control.isEco ?? state.isEco,
    isPowerSaving: control.isEco ?? state.isPowerSaving,
    isElectricHeating: control.isElectricHeating ?? state.isElectricHeating,
    isComfortPowerSave: control.isComfortPowerSave ?? state.isComfortPowerSave,
    isDry: control.isAntiMildew ?? state.isDry
  }
}

/**
 * 编码定时开关与小时字节.
 * @param timer 定时设置.
 * @returns 定时字节.
 */
function encodeTimerByte(timer: AcTimer): number {
  if (!timer.isEnabled) {
    return TIMER_DISABLED_BYTE
  }
  const hours = Math.floor(timer.minutes / MINUTES_PER_HOUR)
  const steps = Math.floor((timer.minutes % MINUTES_PER_HOUR) / MINUTES_PER_STEP)
  return TIMER_ENABLED_BIT | (hours << 2) | steps
}

/**
 * 计算定时分钟字段 (4 位): 15 减去不足一刻钟的分钟数.
 * @param timer 定时设置.
 * @returns 分钟字段.
 */
function encodeTimerMinuteNibble(timer: AcTimer): number {
  return MINUTES_PER_STEP - ((timer.minutes % MINUTES_PER_HOUR) % MINUTES_PER_STEP)
}

/**
 * 写入舒适睡眠曲线 (body[11..17]), 与 v96 版 Lua 0x40 分支在没有自定义曲线时一致.
 * @param payload 控制负载, 原地写入.
 * @param state 全量状态.
 * @param temperature 已限制在设置页范围内的设定温度整数部分.
 */
function writeComfortSleepCurve(
  payload: number[],
  state: AcProtocolState,
  temperature: number
): void {
  const direction = state.modeByte === MODE_BYTES.heat ? -1 : 1
  const firstHour = clamp(temperature + direction, COMFORT_SLEEP_CURVE_MIN, COMFORT_SLEEP_CURVE_MAX)
  const otherHours = clamp(
    temperature + direction * 2,
    COMFORT_SLEEP_CURVE_MIN,
    COMFORT_SLEEP_CURVE_MAX
  )
  const first = firstHour - COMFORT_SLEEP_CURVE_MIN
  const other = otherHours - COMFORT_SLEEP_CURVE_MIN
  payload[11] = first | (other << 4)
  payload[12] = other | (other << 4)
  payload[13] = other | (other << 4)
  payload[14] = other | (other << 4)
  payload[15] = other | (other << 4)
  if (state.hasHalfDegree) {
    payload[16] = 0xff
    payload[17] = COMFORT_SLEEP_TIME | 0x30
  } else {
    payload[17] = COMFORT_SLEEP_TIME
  }
}

/**
 * 把全量状态编码为基础状态控制 (0x40) 的负载, 逐字节对应 v96 版 Lua jsonToData 的 0x40 分支.
 * @param state 合成后的全量状态.
 * @param isBuzzerOn 这条指令是否让空调鸣响.
 * @returns 随机字节之前的控制负载.
 */
export function buildControlPayload(
  state: AcProtocolState,
  isBuzzerOn: boolean
): readonly number[] {
  const temperature = clamp(
    state.temperature,
    TARGET_TEMPERATURE_RANGE.MIN,
    TARGET_TEMPERATURE_RANGE.MAX
  )
  const payload = new Array<number>(CONTROL_PAYLOAD_LENGTH).fill(0)
  payload[0] = CONTROL_COMMAND
  payload[1] =
    (state.isPoweredOn ? 0x01 : 0x00) |
    CONTROL_FIXED_BITS.CLIENT_MOBILE |
    (isBuzzerOn ? CONTROL_FIXED_BITS.BUZZER_ON : 0x00)
  payload[2] =
    (state.modeByte & MODE_MASK) |
    ((temperature - TEMPERATURE_BASE) & 0x0f) |
    (state.hasHalfDegree ? 0x10 : 0x00)
  payload[3] = state.fanSpeed
  payload[4] = encodeTimerByte(state.powerOnTimer)
  payload[5] = encodeTimerByte(state.powerOffTimer)
  payload[6] =
    (encodeTimerMinuteNibble(state.powerOnTimer) << 4) |
    encodeTimerMinuteNibble(state.powerOffTimer)
  payload[7] =
    (state.isSwingLeftRight ? 0x03 : 0x00) |
    (state.isSwingUpDown ? 0x0c : 0x00) |
    CONTROL_FIXED_BITS.SWING_FIXED
  payload[8] =
    (state.isStrongWind ? 0x20 : 0x00) |
    (state.isComfortSleep ? 0x03 : 0x00) |
    (state.isPowerSaving ? 0x08 : 0x00)
  payload[9] =
    (state.isPurifier ? 0x20 : 0x00) |
    (state.isEco ? 0x80 : 0x00) |
    (state.isDry ? 0x04 : 0x00) |
    (state.isElectricHeating ? 0x08 : 0x00) |
    (state.isComfortSleep ? 0x40 : 0x00)
  payload[10] = state.isPreventCold ? 0x08 : 0x00
  if (state.isComfortSleep) {
    writeComfortSleepCurve(payload, state, temperature)
  }
  payload[17] |= (state.pmvLevel & 0x08) << 4
  payload[18] |= (state.pmvLevel & 0x07) << 5
  if (state.isNaturalWind) {
    payload[17] |= 0x40
  }
  if (temperature < EXTENDED_TEMPERATURE_LOW_THRESHOLD) {
    payload[18] |= (temperature - EXTENDED_TEMPERATURE_BASE) & 0x1f
  }
  if (state.modeByte === MODE_BYTE_SMART_DRY) {
    payload[19] |= state.smartDryValue & 0x7f
  }
  payload[19] |= CONTROL_FIXED_BITS.SWING_LEFT_RIGHT_UNDER_ENABLE
  payload[20] |= state.isSwingLeftRightUnder ? 0x80 : 0x00
  payload[22] = state.isComfortPowerSave ? 0x01 : 0x00
  return payload
}

/**
 * 基础状态查询帧的负载, 与 v96 版 Lua 查询分支一致.
 * @returns 随机字节之前的查询负载.
 */
export function buildQueryPayload(): readonly number[] {
  const payload = new Array<number>(QUERY_PAYLOAD_LENGTH).fill(0)
  payload[0] = QUERY_COMMAND
  payload[1] = 0x81
  payload[3] = 0xff
  return payload
}

/**
 * 屏幕显示切换帧的负载, 与 v96 版 Lua screen_display 分支一致; 该帧以查询报文类型下发,
 * 不带开关取值, 每下发一次屏幕显示翻转一次.
 * @param isBuzzerOn 这条指令是否让空调鸣响.
 * @returns 随机字节之前的切换负载.
 */
export function buildScreenDisplayTogglePayload(isBuzzerOn: boolean): readonly number[] {
  const payload = new Array<number>(SCREEN_DISPLAY_TOGGLE_PAYLOAD_LENGTH).fill(0)
  payload[0] = QUERY_COMMAND
  payload[1] = isBuzzerOn
    ? SCREEN_DISPLAY_TOGGLE_FLAGS.BUZZER_ON
    : SCREEN_DISPLAY_TOGGLE_FLAGS.BUZZER_OFF
  payload[3] = 0xff
  payload[4] = 0x02
  payload[5] = 0xff
  payload[6] = 0x02
  payload[7] = 0x02
  return payload
}
