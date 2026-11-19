import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { MessageAlert } from '@renderer/components/message-alert'
import { Button } from '@renderer/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Spinner } from '@renderer/components/ui/spinner'

import { PRESET_NAME_MAX_LENGTH } from '../../../../shared/air-conditioner-presets'
import type { PresetClientError } from './preset-client'
import { PRESET_ERROR_KEYS } from './preset-errors'

/**
 * PresetNameDialog 的属性.
 */
interface PresetNameDialogProps {
  /**
   * 对话框是否打开.
   */
  readonly isOpen: boolean
  /**
   * 对话框标题.
   */
  readonly title: string
  /**
   * 标题下的说明.
   */
  readonly description: string
  /**
   * 打开时输入框中的名称.
   */
  readonly initialName: string
  /**
   * 提交按钮文字.
   */
  readonly submitLabel: string
  /**
   * 提交名称; 返回拒绝原因时对话框保持打开并显示提示, 返回 undefined 时关闭.
   */
  readonly onSubmit: (name: string) => Promise<PresetClientError | undefined>
  /**
   * 请求打开或关闭对话框.
   */
  readonly onOpenChange: (isOpen: boolean) => void
}

/**
 * 输入预设名称的对话框, 保存为预设与改名共用: 名称输入框, 拒绝原因提示, 取消与提交按钮.
 * 名称规则 (非空, 长度, 不重名) 由主进程判定, 这里只显示结果; 对话框每次打开时重置输入.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function PresetNameDialog({
  isOpen,
  title,
  description,
  initialName,
  submitLabel,
  onSubmit,
  onOpenChange
}: PresetNameDialogProps): React.JSX.Element {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <PresetNameForm
          initialName={initialName}
          submitLabel={submitLabel}
          onSubmit={onSubmit}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

/**
 * PresetNameForm 的属性.
 */
interface PresetNameFormProps {
  /**
   * 初始名称.
   */
  readonly initialName: string
  /**
   * 提交按钮文字.
   */
  readonly submitLabel: string
  /**
   * 提交名称, 返回拒绝原因或 undefined.
   */
  readonly onSubmit: (name: string) => Promise<PresetClientError | undefined>
  /**
   * 提交成功后的回调.
   */
  readonly onDone: () => void
}

/**
 * 对话框内的名称表单; 随对话框内容挂载, 关闭后卸载, 因此每次打开都从初始名称开始.
 * @param props 组件属性.
 * @returns 表单元素.
 */
function PresetNameForm({
  initialName,
  submitLabel,
  onSubmit,
  onDone
}: PresetNameFormProps): React.JSX.Element {
  const { t } = useTranslation()
  const nameId = useId()
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<PresetClientError>()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (isSubmitting) {
      return
    }
    setIsSubmitting(true)
    setError(undefined)
    const submitError = await onSubmit(name)
    setIsSubmitting(false)
    if (submitError === undefined) {
      onDone()
      return
    }
    setError(submitError)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)} noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor={nameId}>{t('airConditioner.presets.nameLabel')}</Label>
        <Input
          id={nameId}
          value={name}
          maxLength={PRESET_NAME_MAX_LENGTH}
          placeholder={t('airConditioner.presets.namePlaceholder')}
          autoComplete="off"
          disabled={isSubmitting}
          aria-invalid={error !== undefined}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      {error !== undefined && (
        <MessageAlert
          tone="error"
          message={t(PRESET_ERROR_KEYS[error], { max: PRESET_NAME_MAX_LENGTH })}
        />
      )}
      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline" disabled={isSubmitting}>
            {t('airConditioner.presets.cancel')}
          </Button>
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner aria-hidden />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}
