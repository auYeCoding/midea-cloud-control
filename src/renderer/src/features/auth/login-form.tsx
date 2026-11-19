import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageAlert } from '@renderer/components/message-alert'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'

import type { PasswordCredentials } from '../../../../shared/auth'
import { authClient } from './auth-client'
import { LoginSubmitButton } from './login-submit-button'
import { useLoginSubmission } from './use-login-submission'

/**
 * LoginForm 的属性.
 */
interface LoginFormProps {
  /**
   * 登录成功后的回调, 其返回的 Promise 兑现前按钮保持加载状态.
   */
  readonly onLoggedIn: () => void | Promise<void>
}

/**
 * 账号密码登录表单: 账号, 遮蔽输入的密码, 登录按钮与失败提示.
 * @param props 组件属性.
 * @returns 表单元素.
 */
export function LoginForm({ onLoggedIn }: LoginFormProps): React.JSX.Element {
  const { t } = useTranslation()
  const accountId = useId()
  const passwordId = useId()
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const { isSubmitting, failure, submit } = useLoginSubmission<PasswordCredentials>(
    authClient.loginWithPassword,
    onLoggedIn
  )
  const trimmedAccount = account.trim()
  const canSubmit = trimmedAccount !== '' && password !== '' && !isSubmitting

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if (canSubmit) {
      void submit({ account: trimmedAccount, password })
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor={accountId}>{t('auth.accountLabel')}</Label>
        <Input
          id={accountId}
          autoComplete="username"
          placeholder={t('auth.accountPlaceholder')}
          value={account}
          disabled={isSubmitting}
          onChange={(event) => setAccount(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={passwordId}>{t('auth.passwordLabel')}</Label>
        <Input
          id={passwordId}
          type="password"
          autoComplete="current-password"
          placeholder={t('auth.passwordPlaceholder')}
          value={password}
          disabled={isSubmitting}
          aria-invalid={failure !== undefined}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      {failure !== undefined && (
        <MessageAlert tone="error" message={failure.cloudMessage ?? t('auth.loginFailed')} />
      )}
      <LoginSubmitButton isSubmitting={isSubmitting} disabled={!canSubmit} />
    </form>
  )
}
