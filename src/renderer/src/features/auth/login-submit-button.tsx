import { useTranslation } from 'react-i18next'
import { Button } from '@renderer/components/ui/button'
import { Spinner } from '@renderer/components/ui/spinner'

/**
 * LoginSubmitButton 的属性.
 */
interface LoginSubmitButtonProps {
  /**
   * 是否正在提交; 提交中显示加载图标与提交中文案.
   */
  readonly isSubmitting: boolean
  /**
   * 是否禁用.
   */
  readonly disabled: boolean
}

/**
 * 各登录方式表单共用的登录提交按钮.
 * @param props 组件属性.
 * @returns 按钮元素.
 */
export function LoginSubmitButton({
  isSubmitting,
  disabled
}: LoginSubmitButtonProps): React.JSX.Element {
  const { t } = useTranslation()
  return (
    <Button type="submit" size="lg" className="mbs-2" disabled={disabled}>
      {isSubmitting && <Spinner aria-hidden />}
      {isSubmitting ? t('auth.submitting') : t('auth.submit')}
    </Button>
  )
}
