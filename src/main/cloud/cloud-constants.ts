/**
 * 美居云端的线路域名. 两条线路可互换, 按各接口抓包时的归属选用.
 */
export const CLOUD_HOSTS = {
  /**
   * 多数业务接口, 预登录与设备列表.
   */
  ALI: 'mp-ali.smartmidea.net',
  /**
   * 登录与用户信息.
   */
  PROD: 'mp-prod.smartmidea.net'
} as const

/**
 * 云端线路域名.
 */
export type CloudHost = (typeof CLOUD_HOSTS)[keyof typeof CLOUD_HOSTS]

/**
 * 统一包装接口的路径, 真实接口经 alias 查询参数传入.
 */
export const CLOUD_PROXY_PATH = '/mas/v5/app/proxy'

/**
 * 本切片用到的真实接口别名.
 */
export const CLOUD_ALIASES = {
  /**
   * 预登录, 取一次性 loginId.
   */
  LOGIN_ID: '/v1/user/login/id/get',
  /**
   * 账号密码登录.
   */
  LOGIN: '/v6/mj/user/login',
  /**
   * 向手机号发送短信验证码.
   */
  SMS_CODE: '/mj/user/getSmsCode',
  /**
   * 短信验证码登录, 新手机号会直接注册.
   */
  SMS_LOGIN: '/v6/mj/user/register',
  /**
   * 家庭设备聚合列表.
   */
  HOME_APPLIANCES: '/v2/appliance/home/list/aggregate',
  /**
   * 用 tokenPwd 续期 accessToken.
   */
  AUTO_LOGIN: '/mj/user/autoLogin',
  /**
   * 注销登录.
   */
  LOGOUT: '/v6/mj/user/logout',
  /**
   * 向设备透传一帧数据 (状态查询与控制共用).
   */
  TRANSPARENT_SEND: '/v1/appliance/transparent/send'
} as const

/**
 * 云端接口别名.
 */
export type CloudAlias = (typeof CLOUD_ALIASES)[keyof typeof CLOUD_ALIASES]

/**
 * 模拟的美居 App 版本号.
 */
export const APP_VERSION = '11.7.15'

/**
 * 美居 App 的应用标识.
 */
export const APP_ID = '900'

/**
 * 登录请求 data 段中的应用 key.
 */
export const APP_KEY = '46579c15'

/**
 * 与 APP_KEY 配对的应用密钥, 用于注销请求的 Basic 认证.
 */
const APP_SECRET = '5e987ac6d2e04d95a9d8f0d1'

/**
 * 注销请求的 Authorization 请求头值: Basic base64(APP_KEY:APP_SECRET).
 */
export const LOGOUT_AUTHORIZATION = `Basic ${Buffer.from(`${APP_KEY}:${APP_SECRET}`, 'utf8').toString('base64')}`

/**
 * 注销请求中的 logoffType, 0 表示普通退出登录.
 */
export const LOGOFF_TYPE_NORMAL = 0

/**
 * 续期请求中的 rule 字段值.
 */
export const AUTO_LOGIN_RULE = 1

/**
 * 云端判定令牌失效的响应 code, 按字符串比较; 命中时用 tokenPwd 续期.
 */
export const TOKEN_EXPIRED_CODES: ReadonlySet<string> = new Set([
  '40001',
  '40002',
  '60004',
  '61004'
])

/**
 * 模拟的手机系统版本.
 */
export const OS_VERSION = '16'

/**
 * 模拟的手机型号名称.
 */
export const DEVICE_NAME = 'google Pixel 8 Pro'

/**
 * 登录请求 iotData 段中的客户端类型.
 */
export const LOGIN_CLIENT_TYPE = 1

/**
 * 登录请求 data 段中的平台编号.
 */
export const LOGIN_PLATFORM = 2

/**
 * 发送短信验证码请求 iotData 段中的 type 字段值, 取自资料方式 B 步骤 1 的抓包值.
 */
export const SMS_CODE_TYPE_LOGIN = 9

/**
 * 发送短信验证码请求中的图形验证码; 本客户端不支持图形验证码, 固定传空字符串.
 */
export const SMS_IMAGE_CODE_NONE = ''

/**
 * 短信验证码登录请求 iotData 段中的 loginType 字段值.
 */
export const SMS_LOGIN_TYPE = 0

/**
 * 每个请求都要携带的公共请求头 (不含签名与时间戳).
 */
export const COMMON_HEADERS: Readonly<Record<string, string>> = {
  'User-Agent': `meiju/${APP_VERSION}.3 (Android;husky16)`,
  appId: APP_ID,
  terminalId: `${APP_ID}-android`,
  secretVersion: '1',
  version: APP_VERSION,
  systemVersion: OS_VERSION,
  platform: '0',
  'Content-Type': 'application/json; charset=utf-8',
  'Accept-Encoding': 'identity'
}

/**
 * 请求签名所用的 HMAC-SHA256 密钥.
 */
export const SIGN_KEY = 'PROD_VnoClJI9aikS8dyy'

/**
 * 请求签名消息的固定前缀.
 */
export const SIGN_PREFIX = 'prod_secret123@muc'

/**
 * 登录口令哈希所用的固定盐.
 */
export const PASSWORD_SALT = 'ad0ee21d48a64bf49f4fb583ab76e799'

/**
 * 解密登录响应 data.key 所用的 AES-128-ECB 密钥 (ASCII), 解出的结果即设备透传数据的密钥.
 */
export const LOGIN_KEY_DECRYPT_KEY = '96c7acdfdb8af79a'

/**
 * 透传请求体中的 timestamp 字段值.
 */
export const TRANSPARENT_TIMESTAMP = 'true'

/**
 * 透传请求体中的 isFull 字段值.
 */
export const TRANSPARENT_IS_FULL = 'false'

/**
 * 云端成功响应的 code 值.
 */
export const CLOUD_SUCCESS_CODE = 0

/**
 * 设备类型码中表示空调的值.
 */
export const AIR_CONDITIONER_TYPE = '0xAC'

/**
 * 设备品类中表示空调的关键字.
 */
export const AIR_CONDITIONER_CATEGORY_KEYWORD = 'air-conditioner'

/**
 * 设备在线状态字段中表示在线的值.
 */
export const ONLINE_STATUS_ONLINE = '1'
