import { CircleAlert, Info, type LucideIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@renderer/components/ui/alert'

/**
 * 提示条的语气: error 为操作失败, notice 为需要用户知晓的中性提示.
 */
export type MessageAlertTone = 'error' | 'notice'

/**
 * 各语气对应的 Alert 变体与图标.
 */
const TONE_APPEARANCE: Readonly<
  Record<
    MessageAlertTone,
    { readonly variant: 'destructive' | 'default'; readonly icon: LucideIcon }
  >
> = {
  error: { variant: 'destructive', icon: CircleAlert },
  notice: { variant: 'default', icon: Info }
}

/**
 * MessageAlert 的属性.
 */
interface MessageAlertProps {
  /**
   * 已本地化的提示文字.
   */
  readonly message: string
  /**
   * 提示语气, 决定配色与图标.
   */
  readonly tone: MessageAlertTone
}

/**
 * 单行文字提示条: 按语气切换配色与图标, 出现时短暂淡入并轻微下落.
 * @param props 组件属性.
 * @returns 提示元素.
 */
export function MessageAlert({ message, tone }: MessageAlertProps): React.JSX.Element {
  const { variant, icon: Icon } = TONE_APPEARANCE[tone]
  return (
    <Alert
      variant={variant}
      className="duration-200 ease-out animate-in fade-in motion-safe:slide-in-from-top-1"
    >
      <Icon aria-hidden />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
