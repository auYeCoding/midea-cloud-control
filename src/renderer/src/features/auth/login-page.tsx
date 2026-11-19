import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@renderer/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@renderer/components/ui/tabs'
import { MessageAlert } from '@renderer/components/message-alert'

import { LoginForm } from './login-form'
import { SmsLoginForm } from './sms-login-form'

/**
 * 登录方式的取值, 同时作为选项卡的 value.
 */
const LOGIN_METHODS = {
  /**
   * 账号密码登录.
   */
  PASSWORD: 'password',
  /**
   * 短信验证码登录.
   */
  SMS: 'sms'
} as const

/**
 * 登录方式: 账号密码或短信验证码.
 */
type LoginMethod = (typeof LOGIN_METHODS)[keyof typeof LOGIN_METHODS]

/**
 * 进入登录页时默认显示的登录方式.
 */
const DEFAULT_LOGIN_METHOD: LoginMethod = LOGIN_METHODS.PASSWORD

/**
 * 全部已知登录方式, 用于校验 Tabs 回传的值.
 */
const LOGIN_METHOD_VALUES: readonly string[] = Object.values(LOGIN_METHODS)

/**
 * 判断 Tabs 回传的值是否为已知登录方式.
 * @param value Tabs 回传的值.
 * @returns 是已知登录方式时返回 true.
 */
function isLoginMethod(value: string): value is LoginMethod {
  return LOGIN_METHOD_VALUES.includes(value)
}

/**
 * 会话失效提示的内容.
 */
export interface SessionExpiredInfo {
  /**
   * 续期接口返回的描述; 未给出时显示通用文案.
   */
  readonly cloudMessage?: string
}

/**
 * LoginPage 的属性.
 */
interface LoginPageProps {
  /**
   * 登录成功后的回调, 由装配层决定跳转去向.
   */
  readonly onLoggedIn: () => void | Promise<void>
  /**
   * 因会话失效而回到登录页时的提示信息; 正常进入时为 undefined.
   */
  readonly sessionExpired?: SessionExpiredInfo
}

/**
 * 登录页: 居中的登录卡片, 进入时淡入并轻微上移; 会话失效时在表单上方显示提示.
 * 卡片内可在账号密码与短信验证码两种方式间切换; 两个表单都保持挂载, 只隐藏未选中的一个,
 * 使切换后已输入的内容与验证码倒计时得以保留, 重新显示时淡入并轻微上移.
 * 位移只作用于卡片, 外层不参与动画并裁剪溢出, 使动画期间主区域的滚动高度不变.
 * @param props 组件属性.
 * @returns 页面元素.
 */
export function LoginPage({ onLoggedIn, sessionExpired }: LoginPageProps): React.JSX.Element {
  const { t } = useTranslation()
  const [method, setMethod] = useState<LoginMethod>(DEFAULT_LOGIN_METHOD)

  const handleMethodChange = (value: string): void => {
    if (isLoginMethod(value)) {
      setMethod(value)
    }
  }

  return (
    <div className="flex min-block-full items-center justify-center overflow-clip p-6">
      <Card className="inline-full max-inline-sm duration-200 ease-out animate-in fade-in motion-safe:slide-in-from-bottom-2">
        <CardHeader>
          <CardTitle className="text-lg">{t('auth.title')}</CardTitle>
          <CardDescription>{t('auth.description')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {sessionExpired !== undefined && (
            <MessageAlert
              tone="notice"
              message={sessionExpired.cloudMessage ?? t('auth.sessionExpired')}
            />
          )}
          <Tabs value={method} onValueChange={handleMethodChange} className="gap-4">
            <TabsList className="inline-full">
              <TabsTrigger value={LOGIN_METHODS.PASSWORD}>{t('auth.methodPassword')}</TabsTrigger>
              <TabsTrigger value={LOGIN_METHODS.SMS}>{t('auth.methodSms')}</TabsTrigger>
            </TabsList>
            <TabsContent
              value={LOGIN_METHODS.PASSWORD}
              forceMount
              hidden={method !== LOGIN_METHODS.PASSWORD}
              className="duration-200 ease-out animate-in fade-in motion-safe:slide-in-from-bottom-1"
            >
              <LoginForm onLoggedIn={onLoggedIn} />
            </TabsContent>
            <TabsContent
              value={LOGIN_METHODS.SMS}
              forceMount
              hidden={method !== LOGIN_METHODS.SMS}
              className="duration-200 ease-out animate-in fade-in motion-safe:slide-in-from-bottom-1"
            >
              <SmsLoginForm onLoggedIn={onLoggedIn} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
