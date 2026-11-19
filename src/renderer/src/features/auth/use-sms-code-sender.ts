import { useEffect, useState } from 'react'

import type { CloudFailure } from '../../../../shared/auth'
import { authClient } from './auth-client'
import { invokeAuthOperation } from './auth-invocation'

/**
 * 发送成功后到允许再次获取验证码的等待秒数.
 */
const SMS_CODE_RESEND_SECONDS = 60

/**
 * 倒计时每跳一秒的毫秒数.
 */
const COUNTDOWN_TICK_MILLISECONDS = 1000

/**
 * 获取短信验证码的状态与操作.
 */
export interface SmsCodeSenderState {
  /**
   * 是否正在请求发送.
   */
  readonly isSending: boolean
  /**
   * 距离可以再次获取的剩余秒数; 为 0 时可以获取.
   */
  readonly secondsLeft: number
  /**
   * 最近一次发送失败的结果; 尚未失败或正在重试时为 undefined.
   */
  readonly failure: CloudFailure | undefined
  /**
   * 请求发送验证码; 正在发送或倒计时期间忽略调用.
   */
  readonly send: (mobile: string) => Promise<void>
}

/**
 * 管理获取短信验证码的过程: 发送成功后进入倒计时, 倒计时结束前不可再次获取.
 * @returns 发送状态与操作.
 */
export function useSmsCodeSender(): SmsCodeSenderState {
  const [isSending, setIsSending] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [failure, setFailure] = useState<CloudFailure | undefined>(undefined)

  useEffect(() => {
    if (secondsLeft <= 0) {
      return undefined
    }
    const timer = window.setTimeout(
      () => setSecondsLeft((seconds) => seconds - 1),
      COUNTDOWN_TICK_MILLISECONDS
    )
    return () => window.clearTimeout(timer)
  }, [secondsLeft])

  const send = async (mobile: string): Promise<void> => {
    if (isSending || secondsLeft > 0) {
      return
    }
    setIsSending(true)
    setFailure(undefined)
    const result = await invokeAuthOperation(() => authClient.sendSmsCode(mobile), '发送验证码')
    setIsSending(false)
    if (result.ok) {
      setSecondsLeft(SMS_CODE_RESEND_SECONDS)
      return
    }
    setFailure(result)
  }

  return { isSending, secondsLeft, failure, send }
}
