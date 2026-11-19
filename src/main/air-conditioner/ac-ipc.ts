import { ipcMain } from 'electron'

import {
  AIR_CONDITIONER_CHANNELS,
  type AirConditionerControl,
  type AirConditionerStatus,
  type AirConditionerStatusResult
} from '../../shared/air-conditioner'
import { toCloudFailure } from '../cloud/cloud-failure'
import {
  controlAirConditioner,
  getAirConditionerStatus,
  getLatestAirConditionerStatus
} from './ac-service'

/**
 * 执行一次空调操作, 把异常转换为失败结果, 避免错误跨进程时丢失可读原因.
 * @param operation 返回空调状态的操作.
 * @returns 带最新状态的成功结果, 或带云端原因的失败结果.
 */
async function runAirConditionerOperation(
  operation: () => Promise<AirConditionerStatus>
): Promise<AirConditionerStatusResult> {
  try {
    return { ok: true, status: await operation() }
  } catch (error) {
    return toCloudFailure('air-conditioner', error)
  }
}

/**
 * 注册空调设置页相关的 IPC 处理器, 应用生命周期内只调用一次.
 */
export function registerAirConditionerHandlers(): void {
  ipcMain.handle(AIR_CONDITIONER_CHANNELS.GET_STATUS, (_event, applianceCode: string) =>
    runAirConditionerOperation(() => getAirConditionerStatus(applianceCode))
  )
  ipcMain.handle(
    AIR_CONDITIONER_CHANNELS.CONTROL,
    (_event, applianceCode: string, control: AirConditionerControl) =>
      runControlOperation(applianceCode, () => controlAirConditioner(applianceCode, control))
  )
}

/**
 * 执行一次控制类操作 (下发控制或应用预设); 失败时在失败结果中带上主进程已知的最新状态,
 * 让界面显示空调实际状态 (一次控制分 0x40 与 B0 两步下发时, 前一步已生效的变更也包含在内).
 * @param applianceCode 设备唯一标识.
 * @param operation 下发控制并返回控制后状态的操作.
 * @returns 带最新状态的成功结果, 或带云端原因与已知最新状态的失败结果.
 */
export async function runControlOperation(
  applianceCode: string,
  operation: () => Promise<AirConditionerStatus>
): Promise<AirConditionerStatusResult> {
  const result = await runAirConditionerOperation(operation)
  if (result.ok || result.isSessionExpired === true) {
    return result
  }
  return { ...result, status: await getLatestAirConditionerStatus(applianceCode) }
}
