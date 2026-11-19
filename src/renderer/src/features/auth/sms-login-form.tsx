import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { MessageAlert } from '@renderer/components/message-alert'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@renderer/components/ui/input-otp'
import { Label } from '@renderer/components/ui/label'
import { Spinner } from '@renderer/components/ui/spinner'

import type { SmsCodeCredentials } from '../../../../shared/auth'
import { authClient } from './auth-client'
import { LoginSubmitButton } from './login-submit-button'
import { useLoginSubmission } from './use-login-submission'
import { useSmsCodeSender } from './use-sms-code-sender'

/**
 * 手机号的位数.
 */
const MOBILE_LENGTH = 11

/**
 * 手机号的基本格式: MOBILE_LENGTH 位数字; 其余规则交给云端校验.
 */
const MOBILE_PATTERN = new RegExp(`^\\d{${String(MOBILE_LENGTH)}}$`)

/**
 * 短信验证码的位数.
 */
const SMS_CODE_LENGTH = 6

/**
 * 验证码各格的序号.
 */
const SMS_CODE_SLOT_INDEXES = Array.from({ length: SMS_CODE_LENGTH }, (_value, index) => index)

/**
 * SmsLoginForm 的属性.
 */
interface SmsLoginFormProps {
  /**
   * 登录成功后的回调, 其返回的 Promise 兑现前按钮保持加载状态.
   */
  readonly onLoggedIn: () => void | Promise<void>
}

/**
 * 短信验证码登录表单: 手机号与获取验证码按钮 (发送后倒计时), 6 位验证码, 登录按钮与失败提示.
 * @param props 组件属性.
 * @returns 表单元素.
 */
export function SmsLoginForm({ onLoggedIn }: SmsLoginFormProps): React.JSX.Element {
  const { t } = useTranslation()
  const mobileId = useId()
  const smsCodeId = useId()
  const [mobile, setMobile] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const sender = useSmsCodeSender()
  const { isSubmitting, failure, submit } = useLoginSubmission<SmsCodeCredentials>(
    authClient.loginWithSmsCode,
    onLoggedIn
  )
  const trimmedMobile = mobile.trim()
  const isMobileValid = MOBILE_PATTERN.test(trimmedMobile)
  const isCountingDown = sender.secondsLeft > 0
  const canSendCode = isMobileValid && !sender.isSending && !isCountingDown && !isSubmitting
  const canSubmit = isMobileValid && smsCode.length === SMS_CODE_LENGTH && !isSubmitting

  const handleSendCode = (): void => {
    if (canSendCode) {
      void sender.send(trimmedMobile)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if (canSubmit) {
      void submit({ mobile: trimmedMobile, smsCode })
    }
  }

  const sendCodePhase = sender.isSending ? 'sending' : isCountingDown ? 'countdown' : 'idle'
  const sendCodeLabel = {
    sending: t('auth.smsCodeSending'),
    countdown: t('auth.smsCodeResendIn', { seconds: sender.secondsLeft }),
    idle: t('auth.smsCodeSend')
  }[sendCodePhase]

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor={mobileId}>{t('auth.mobileLabel')}</Label>
        <div className="flex gap-2">
          <Input
            id={mobileId}
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={MOBILE_LENGTH}
            placeholder={t('auth.mobilePlaceholder')}
            value={mobile}
            disabled={isSubmitting}
            onChange={(event) => setMobile(event.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            className="min-inline-28 tabular-nums"
            disabled={!canSendCode}
            onClick={handleSendCode}
          >
            {sender.isSending && <Spinner aria-hidden />}
            <span key={sendCodePhase} className="duration-150 ease-out animate-in fade-in">
              {sendCodeLabel}
            </span>
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={smsCodeId}>{t('auth.smsCodeLabel')}</Label>
        <InputOTP
          id={smsCodeId}
          maxLength={SMS_CODE_LENGTH}
          pattern={REGEXP_ONLY_DIGITS}
          autoComplete="one-time-code"
          value={smsCode}
          disabled={isSubmitting}
          containerClassName="inline-full"
          onChange={setSmsCode}
        >
          <InputOTPGroup className="inline-full">
            {SMS_CODE_SLOT_INDEXES.map((index) => (
              <InputOTPSlot
                key={index}
                index={index}
                className="flex-1"
                aria-invalid={failure !== undefined}
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
      {sender.failure !== undefined && (
        <MessageAlert
          tone="error"
          message={sender.failure.cloudMessage ?? t('auth.smsCodeSendFailed')}
        />
      )}
      {failure !== undefined && (
        <MessageAlert tone="error" message={failure.cloudMessage ?? t('auth.loginFailed')} />
      )}
      <LoginSubmitButton isSubmitting={isSubmitting} disabled={!canSubmit} />
    </form>
  )
}
