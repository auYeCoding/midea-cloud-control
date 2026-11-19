import { useTranslation } from 'react-i18next'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@renderer/components/ui/alert-dialog'

/**
 * PresetDeleteDialog 的属性.
 */
interface PresetDeleteDialogProps {
  /**
   * 对话框是否打开.
   */
  readonly isOpen: boolean
  /**
   * 要删除的预设名称; 关闭过程中保留上一次的名称, 避免退场动画中文字消失.
   */
  readonly presetName: string
  /**
   * 确认删除.
   */
  readonly onConfirm: () => void
  /**
   * 请求打开或关闭对话框.
   */
  readonly onOpenChange: (isOpen: boolean) => void
}

/**
 * 删除预设前的确认对话框: 说明删除不可恢复, 取消或确认删除.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function PresetDeleteDialog({
  isOpen,
  presetName,
  onConfirm,
  onOpenChange
}: PresetDeleteDialogProps): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('airConditioner.presets.deleteTitle', { name: presetName })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('airConditioner.presets.deleteDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('airConditioner.presets.cancel')}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            {t('airConditioner.presets.deleteConfirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
