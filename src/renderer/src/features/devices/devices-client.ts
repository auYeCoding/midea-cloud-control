import type { DeviceListResult, DevicesApi } from '../../../../shared/devices'

/**
 * 非 Electron 环境 (如浏览器预览) 下的空实现: 拉取总是失败.
 */
const DETACHED_DEVICES: DevicesApi = {
  listAirConditioners: () => Promise.resolve({ ok: false })
}

/**
 * 渲染进程访问设备能力的唯一入口, 屏蔽 preload 桥是否存在的差异.
 */
const devicesClient: DevicesApi = window.api?.devices ?? DETACHED_DEVICES

/**
 * 从主进程拉取空调列表, 把 IPC 调用本身的异常也视为失败.
 * @returns 空调列表结果.
 */
export async function loadAirConditioners(): Promise<DeviceListResult> {
  try {
    return await devicesClient.listAirConditioners()
  } catch (error) {
    console.error('devices: 拉取设备列表调用失败', error)
    return { ok: false }
  }
}
