import type { CloudFailure } from '../../shared/auth'
import { CloudRequestError, CloudSessionExpiredError } from './cloud-error'

/**
 * 把云端调用抛出的错误转换为跨进程的失败结果, 并在主进程记录日志.
 * @param scope 日志前缀, 标明出错的业务.
 * @param error 捕获到的错误.
 * @returns 失败结果; 云端给出原因时带上原因, 会话无法续期时标明需要重新登录.
 */
export function toCloudFailure(scope: string, error: unknown): CloudFailure {
  console.error(`${scope}: 云端请求失败`, error)
  if (error instanceof CloudSessionExpiredError) {
    return { ok: false, isSessionExpired: true, cloudMessage: error.cloudMessage }
  }
  if (error instanceof CloudRequestError && error.cloudMessage !== undefined) {
    return { ok: false, cloudMessage: error.cloudMessage }
  }
  return { ok: false }
}
