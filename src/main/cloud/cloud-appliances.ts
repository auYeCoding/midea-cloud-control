import { postToCloud, type CloudCredentials } from './cloud-client'
import { CLOUD_ALIASES, CLOUD_HOSTS } from './cloud-constants'
import { isJsonRecord, readRecordArray, readString, type JsonRecord } from './cloud-json'
import { createRequestId, createStamp } from './cloud-request-fields'

/**
 * 云端设备列表中的一台设备, 只保留本应用用到的字段.
 */
export interface CloudAppliance {
  /**
   * 设备唯一标识.
   */
  readonly applianceCode: string
  /**
   * 设备名称.
   */
  readonly name: string
  /**
   * 设备类型码, 如 0xAC.
   */
  readonly type: string
  /**
   * 设备品类, 如 wall-air-conditioner.
   */
  readonly category: string
  /**
   * 在线状态原值, "1" 在线, "0" 离线.
   */
  readonly onlineStatus: string
}

/**
 * 构造家庭设备聚合列表的请求体.
 * @param homegroupId 家庭 id.
 * @returns 请求体.
 */
function buildHomeAppliancesBody(homegroupId: string): Record<string, unknown> {
  return {
    cardType: [
      {
        extra: ['cardOrder', 'compose', 'permission', 'compositeCard'],
        query: { homegroupId },
        type: 'appliance'
      },
      { extra: ['permission'], query: { homegroupId }, type: 'lightGroup' }
    ],
    stamp: createStamp(new Date()),
    reqId: createRequestId()
  }
}

/**
 * 把一条原始设备记录转换为 CloudAppliance.
 * @param record 原始设备记录.
 * @returns 设备; 缺少 applianceCode 时返回 undefined.
 */
function toCloudAppliance(record: JsonRecord): CloudAppliance | undefined {
  const applianceCode = readString(record, 'applianceCode')
  if (applianceCode === undefined) {
    return undefined
  }
  return {
    applianceCode,
    name: readString(record, 'name') ?? '',
    type: readString(record, 'type') ?? '',
    category: readString(record, 'category') ?? '',
    onlineStatus: readString(record, 'onlineStatus') ?? ''
  }
}

/**
 * 拉取一个家庭下全部房间的设备.
 * @param credentials 登录凭据.
 * @param homegroupId 家庭 id.
 * @returns 设备列表 (含非空调设备).
 * @throws CloudRequestError 当云端失败时; 网络错误原样抛出.
 */
export async function fetchHomeAppliances(
  credentials: CloudCredentials,
  homegroupId: string
): Promise<readonly CloudAppliance[]> {
  const data = await postToCloud({
    host: CLOUD_HOSTS.ALI,
    alias: CLOUD_ALIASES.HOME_APPLIANCES,
    body: buildHomeAppliancesBody(homegroupId),
    credentials
  })
  const record = isJsonRecord(data) ? data : {}
  return readRecordArray(record, 'appliance')
    .flatMap((home) => readRecordArray(home, 'roomList'))
    .flatMap((room) => readRecordArray(room, 'applianceList'))
    .map(toCloudAppliance)
    .filter((appliance): appliance is CloudAppliance => appliance !== undefined)
}
