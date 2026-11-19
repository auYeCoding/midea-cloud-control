import type { DeviceSummary } from '../../shared/devices'
import { runWithSession } from '../auth/auth-service'
import { fetchHomeAppliances, type CloudAppliance } from '../cloud/cloud-appliances'
import {
  AIR_CONDITIONER_CATEGORY_KEYWORD,
  AIR_CONDITIONER_TYPE,
  ONLINE_STATUS_ONLINE
} from '../cloud/cloud-constants'

/**
 * 判断设备是否为空调.
 * @param appliance 云端设备.
 * @returns 是空调时返回 true.
 */
function isAirConditioner(appliance: CloudAppliance): boolean {
  return (
    appliance.type === AIR_CONDITIONER_TYPE ||
    appliance.category.includes(AIR_CONDITIONER_CATEGORY_KEYWORD)
  )
}

/**
 * 把云端设备转换为设备摘要.
 * @param appliance 云端设备.
 * @returns 设备摘要.
 */
function toDeviceSummary(appliance: CloudAppliance): DeviceSummary {
  return {
    applianceCode: appliance.applianceCode,
    name: appliance.name,
    isOnline: appliance.onlineStatus === ONLINE_STATUS_ONLINE
  }
}

/**
 * 用当前会话拉取账号下全部家庭的空调, 按 applianceCode 去重; 令牌失效时经会话续期后重试.
 * @returns 空调摘要列表.
 * @throws NotLoggedInError 当没有登录会话时.
 * @throws CloudSessionExpiredError 当令牌无法续期时.
 * @throws CloudRequestError 当云端失败时; 网络错误原样抛出.
 */
export async function listAirConditioners(): Promise<readonly DeviceSummary[]> {
  const homes = await runWithSession((credentials, session) =>
    Promise.all(
      session.homegroupIds.map((homegroupId) => fetchHomeAppliances(credentials, homegroupId))
    )
  )
  const airConditioners = new Map<string, DeviceSummary>()
  for (const appliance of homes.flat().filter(isAirConditioner)) {
    airConditioners.set(appliance.applianceCode, toDeviceSummary(appliance))
  }
  return [...airConditioners.values()]
}
