import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, RefreshCw } from 'lucide-react'
import { cn } from 'cn'

import { MessageAlert, type MessageAlertTone } from '@renderer/components/message-alert'
import { Button } from '@renderer/components/ui/button'

import type { AirConditionerPreset } from '../../../../shared/air-conditioner-presets'
import { PresetDeleteDialog } from './preset-delete-dialog'
import { PRESET_ERROR_KEYS } from './preset-errors'
import { PresetListItem } from './preset-list-item'
import { PresetNameDialog } from './preset-name-dialog'
import type { PresetsController } from './use-presets'

/**
 * 预设分区当前对应的对话框: 保存为预设, 改名或删除确认; 后两者带目标预设.
 */
type PresetDialogTarget =
  | { readonly kind: 'save' }
  | { readonly kind: 'rename' | 'delete'; readonly preset: AirConditionerPreset }

/**
 * 分区内提示条的内容: 用当前设置更新成功, 或更新, 删除被拒绝的原因.
 */
interface PresetNotice {
  /**
   * 提示语气.
   */
  readonly tone: MessageAlertTone
  /**
   * 已本地化的提示文字.
   */
  readonly message: string
}

/**
 * PresetSection 的属性.
 */
interface PresetSectionProps {
  /**
   * 预设列表与管理操作.
   */
  readonly controller: PresetsController
  /**
   * 空调是否正忙 (同步或控制进行中); 忙时不能应用, 保存或管理预设, 避免保存到变化中的状态.
   */
  readonly isBusy: boolean
  /**
   * 应用一套预设.
   */
  readonly onApply: (preset: AirConditionerPreset) => void
}

/**
 * 预设管理内容 (放在管理预设对话框中): 顶部为 "保存为预设", 下方为本空调的预设列表 (点即应用) 或空状态说明.
 * 保存与改名经名称对话框, 删除先确认; 用当前设置更新与删除的结果以提示条反馈.
 * 预设读取失败 (预设文件损坏, 或 IPC 调用异常) 时只显示错误提示与 "重新读取" 按钮, 保存与管理全部禁用;
 * 文件损坏时主进程也拒绝修改, 原文件不动.
 * @param props 组件属性.
 * @returns 分区元素.
 */
export function PresetSection({
  controller,
  isBusy,
  onApply
}: PresetSectionProps): React.JSX.Element {
  const { t } = useTranslation()
  const {
    presets,
    loadError,
    isReloading,
    isMutating,
    reload,
    saveCurrent,
    rename,
    overwrite,
    remove
  } = controller
  const [dialogTarget, setDialogTarget] = useState<PresetDialogTarget>({ kind: 'save' })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [notice, setNotice] = useState<PresetNotice>()
  const isEnabled = !isBusy && !isMutating && loadError === undefined

  const openDialog = (target: PresetDialogTarget): void => {
    setNotice(undefined)
    setDialogTarget(target)
    setIsDialogOpen(true)
  }

  const handleOverwrite = async (preset: AirConditionerPreset): Promise<void> => {
    setNotice(undefined)
    const error = await overwrite(preset.id)
    setNotice(
      error === undefined
        ? {
            tone: 'notice',
            message: t('airConditioner.presets.overwritten', { name: preset.name })
          }
        : { tone: 'error', message: t(PRESET_ERROR_KEYS[error]) }
    )
  }

  const handleDelete = async (preset: AirConditionerPreset): Promise<void> => {
    const error = await remove(preset.id)
    if (error !== undefined) {
      setNotice({ tone: 'error', message: t(PRESET_ERROR_KEYS[error]) })
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button
        variant="outline"
        size="sm"
        disabled={!isEnabled}
        onClick={() => openDialog({ kind: 'save' })}
        className="self-start"
      >
        <Plus
          aria-hidden
          className="transition-transform duration-150 ease-out motion-safe:group-hover/button:rotate-90"
        />
        {t('airConditioner.presets.save')}
      </Button>
      <div className="flex flex-col gap-3">
        {loadError !== undefined && (
          <div className="flex flex-col items-start gap-2">
            <MessageAlert tone="error" message={t(PRESET_ERROR_KEYS[loadError])} />
            <Button
              variant="outline"
              size="sm"
              disabled={isReloading}
              onClick={() => void reload()}
            >
              <RefreshCw aria-hidden className={cn(isReloading && 'motion-safe:animate-spin')} />
              {isReloading
                ? t('airConditioner.presets.reloading')
                : t('airConditioner.presets.reload')}
            </Button>
          </div>
        )}
        {notice !== undefined && <MessageAlert tone={notice.tone} message={notice.message} />}
        {loadError !== undefined ? null : presets.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('airConditioner.presets.empty')}</p>
        ) : (
          <ul className="-mx-2 flex flex-col gap-0.5">
            {presets.map((preset) => (
              <PresetListItem
                key={preset.id}
                preset={preset}
                isEnabled={isEnabled}
                onApply={() => onApply(preset)}
                onRename={() => openDialog({ kind: 'rename', preset })}
                onOverwrite={() => void handleOverwrite(preset)}
                onDelete={() => openDialog({ kind: 'delete', preset })}
              />
            ))}
          </ul>
        )}
      </div>
      <PresetNameDialog
        isOpen={isDialogOpen && dialogTarget.kind !== 'delete'}
        title={
          dialogTarget.kind === 'rename'
            ? t('airConditioner.presets.renameTitle')
            : t('airConditioner.presets.saveTitle')
        }
        description={
          dialogTarget.kind === 'rename'
            ? t('airConditioner.presets.renameDescription')
            : t('airConditioner.presets.saveDescription')
        }
        initialName={dialogTarget.kind === 'rename' ? dialogTarget.preset.name : ''}
        submitLabel={t('airConditioner.presets.submit')}
        onSubmit={(name) =>
          dialogTarget.kind === 'rename' ? rename(dialogTarget.preset.id, name) : saveCurrent(name)
        }
        onOpenChange={setIsDialogOpen}
      />
      <PresetDeleteDialog
        isOpen={isDialogOpen && dialogTarget.kind === 'delete'}
        presetName={dialogTarget.kind === 'save' ? '' : dialogTarget.preset.name}
        onConfirm={() => {
          if (dialogTarget.kind === 'delete') {
            void handleDelete(dialogTarget.preset)
          }
        }}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  )
}
