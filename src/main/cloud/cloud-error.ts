/**
 * 云端请求失败时抛出的错误: 云端返回非成功 code, 或响应结构不符合约定.
 */
export class CloudRequestError extends Error {
  /**
   * 创建云端请求错误.
   * @param message 供日志使用的错误描述.
   * @param cloudMessage 云端返回的错误描述; 云端未给出时为 undefined.
   * @param code 云端返回的非成功 code, 已转为字符串; 不是云端业务失败 (如 HTTP 错误, 结构不符) 时为 undefined.
   */
  constructor(
    message: string,
    readonly cloudMessage?: string,
    readonly code?: string
  ) {
    super(message)
    this.name = 'CloudRequestError'
  }
}

/**
 * 云端判定当前 accessToken 已失效时抛出的错误, 调用方应续期后重试.
 */
export class CloudTokenExpiredError extends CloudRequestError {
  /**
   * 创建令牌失效错误.
   * @param message 供日志使用的错误描述.
   * @param cloudMessage 云端返回的错误描述.
   * @param code 命中的失效 code.
   */
  constructor(message: string, cloudMessage: string | undefined, code: string) {
    super(message, cloudMessage, code)
    this.name = 'CloudTokenExpiredError'
  }
}

/**
 * 登录会话无法续期时抛出的错误: 续期接口返回非成功 code 或没有返回新令牌, 需要重新登录.
 */
export class CloudSessionExpiredError extends CloudRequestError {
  /**
   * 创建会话失效错误.
   * @param message 供日志使用的错误描述.
   * @param cloudMessage 续期接口返回的错误描述; 未给出时为 undefined.
   */
  constructor(message: string, cloudMessage?: string) {
    super(message, cloudMessage)
    this.name = 'CloudSessionExpiredError'
  }
}
