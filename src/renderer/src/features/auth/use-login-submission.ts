import { useState } from 'react'

import type { CloudFailure, LoginResult } from '../../../../shared/auth'
import { invokeAuthOperation } from './auth-invocation'

/**
 * 一种登录方式的提交状态与操作.
 */
export interface LoginSubmissionState<TCredentials> {
  /**
   * 是否正在提交.
   */
  readonly isSubmitting: boolean
  /**
   * 最近一次失败的结果; 尚未失败或正在重试时为 undefined.
   */
  readonly failure: CloudFailure | undefined
  /**
   * 提交登录; 正在提交时忽略重复调用.
   */
  readonly submit: (credentials: TCredentials) => Promise<void>
}

/**
 * 管理一种登录方式的提交过程, 各登录方式共用同一套提交状态.
 * @param login 发起该方式登录的跨进程调用.
 * @param onLoggedIn 登录成功后的回调, 其返回的 Promise 兑现前保持提交状态.
 * @returns 提交状态与操作.
 */
export function useLoginSubmission<TCredentials>(
  login: (credentials: TCredentials) => Promise<LoginResult>,
  onLoggedIn: () => void | Promise<void>
): LoginSubmissionState<TCredentials> {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [failure, setFailure] = useState<CloudFailure | undefined>(undefined)

  const submit = async (credentials: TCredentials): Promise<void> => {
    if (isSubmitting) {
      return
    }
    setIsSubmitting(true)
    setFailure(undefined)
    const result = await invokeAuthOperation(() => login(credentials), '登录')
    if (result.ok) {
      await onLoggedIn()
      return
    }
    setFailure(result)
    setIsSubmitting(false)
  }

  return { isSubmitting, failure, submit }
}
