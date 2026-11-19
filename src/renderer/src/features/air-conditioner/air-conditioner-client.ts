import type {
  AirConditionerApi,
  AirConditionerControl,
  AirConditionerStatusResult
} from '../../../../shared/air-conditioner'

/**
 * 非 Electron 环境 (如浏览器预览) 下的空实现: 查询与控制总是失败.
 */
const DETACHED_AIR_CONDITIONER: AirConditionerApi = {
  getStatus: () => Promise.resolve({ ok: false }),
  control: () => Promise.resolve({ ok: false })
}

/**
 * 渲染进程访问空调控制能力的唯一入口, 屏蔽 preload 桥是否存在的差异.
 */
const airConditionerClient: AirConditionerApi =
  window.api?.airConditioner ?? DETACHED_AIR_CONDITIONER

/**
 * 发起一次空调相关的跨进程调用, 把 IPC 调用本身的异常也视为失败.
 * @param operation 发起调用的函数.
 * @param description 写入日志的调用说明.
 * @returns 调用结果; IPC 异常时为不带原因的失败.
 */
async function invokeAirConditioner(
  operation: () => Promise<AirConditionerStatusResult>,
  description: string
): Promise<AirConditionerStatusResult> {
  try {
    return await operation()
  } catch (error) {
    console.error(`air-conditioner: ${description}调用失败`, error)
    return { ok: false }
  }
}

/**
 * 从主进程同步一台空调的当前状态.
 * @param applianceCode 设备唯一标识.
 * @returns 状态结果.
 */
export function loadAirConditionerStatus(
  applianceCode: string
): Promise<AirConditionerStatusResult> {
  return invokeAirConditioner(() => airConditionerClient.getStatus(applianceCode), '同步状态')
}

/**
 * 请主进程向一台空调下发控制.
 * @param applianceCode 设备唯一标识.
 * @param control 要改变的设置.
 * @returns 控制后的状态结果.
 */
export function sendAirConditionerControl(
  applianceCode: string,
  control: AirConditionerControl
): Promise<AirConditionerStatusResult> {
  return invokeAirConditioner(
    () => airConditionerClient.control(applianceCode, control),
    '下发控制'
  )
}
