import type { LoginResult, SendSmsCodeResult } from '../../../../shared/auth'

/**
 * 登录相关跨进程调用的结果: 成功, 或带云端原因的失败.
 */
type AuthOperationResult = LoginResult | SendSmsCodeResult

/**
 * 调用登录能力, 把 IPC 调用本身的异常也视为失败.
 * @param operation 发起跨进程调用的函数.
 * @param description 写入日志的调用说明.
 * @returns 调用结果; IPC 异常时为不带原因的失败.
 */
export async function invokeAuthOperation(
  operation: () => Promise<AuthOperationResult>,
  description: string
): Promise<AuthOperationResult> {
  try {
    return await operation()
  } catch (error) {
    console.error(`auth: ${description}调用失败`, error)
    return { ok: false }
  }
}
