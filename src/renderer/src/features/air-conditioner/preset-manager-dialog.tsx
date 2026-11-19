import { useTranslation } from 'react-i18next'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@renderer/components/ui/dialog'

import type { AirConditionerPreset } from '../../../../shared/air-conditioner-presets'
import { PresetSection } from './preset-section'
import type { PresetsController } from './use-presets'

/**
 * PresetManagerDialog 的属性.
 */
interface PresetManagerDialogProps {
  /**
   * 是否打开.
   */
  readonly isOpen: boolean
  /**
   * 打开状态变化时的回调.
   */
  readonly onOpenChange: (isOpen: boolean) => void
  /**
   * 预设列表与管理操作.
   */
  readonly controller: PresetsController
  /**
   * 同步或下发进行中时禁用管理操作.
   */
  readonly isBusy: boolean
  /**
   * 应用一套预设; 应用后关闭对话框.
   */
  readonly onApply: (preset: AirConditionerPreset) => void
}

/**
 * 管理预设对话框: 保存当前设置为预设, 改名, 用当前设置更新, 删除, 也可直接点预设应用.
 * @param props 组件属性.
 * @returns 对话框元素.
 */
export function PresetManagerDialog({
  isOpen,
  onOpenChange,
  controller,
  isBusy,
  onApply
}: PresetManagerDialogProps): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('airConditioner.presets.manageTitle')}</DialogTitle>
          <DialogDescription>{t('airConditioner.presets.manageDescription')}</DialogDescription>
        </DialogHeader>
        <PresetSection
          controller={controller}
          isBusy={isBusy}
          onApply={(preset) => {
            onOpenChange(false)
            onApply(preset)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
