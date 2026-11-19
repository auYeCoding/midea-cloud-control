import { useEffect, useEffectEvent, useState } from 'react'

import type { AirConditionerPreset } from '../../../../shared/air-conditioner-presets'
import {
  loadPresets,
  overwritePreset,
  removePreset,
  renamePreset,
  saveCurrentAsPreset,
  type PresetClientError,
  type PresetClientResult
} from './preset-client'

/**
 * 一台空调的预设列表与管理操作. 各管理操作返回失败原因, 成功时返回 undefined.
 */
export interface PresetsController {
  /**
   * 预设, 按保存顺序排列.
   */
  readonly presets: readonly AirConditionerPreset[]
  /**
   * 读取预设失败的原因 (预设文件无法读取, 或 IPC 调用异常); 读取成功时为 undefined.
   * 有值时界面应提示, 禁用保存与管理, 并提供重新读取.
   */
  readonly loadError?: PresetClientError
  /**
   * 是否正在重新读取预设.
   */
  readonly isReloading: boolean
  /**
   * 是否有管理操作正在进行.
   */
  readonly isMutating: boolean
  /**
   * 重新读取预设; 读取失败后用于重试.
   */
  readonly reload: () => Promise<void>
  /**
   * 把当前设置保存为一套新预设.
   */
  readonly saveCurrent: (name: string) => Promise<PresetClientError | undefined>
  /**
   * 给一套预设改名.
   */
  readonly rename: (presetId: string, name: string) => Promise<PresetClientError | undefined>
  /**
   * 用当前设置覆盖一套预设.
   */
  readonly overwrite: (presetId: string) => Promise<PresetClientError | undefined>
  /**
   * 删除一套预设.
   */
  readonly remove: (presetId: string) => Promise<PresetClientError | undefined>
}

/**
 * 管理一台空调的预设: 进入时读取一次, 读取失败时记录原因并允许重新读取;
 * 管理操作成功后以主进程返回的列表为准. 预设的保存与校验都在主进程, 本 hook 只转发并记录结果.
 * @param applianceCode 设备唯一标识.
 * @returns 预设列表与管理操作.
 */
export function usePresets(applianceCode: string): PresetsController {
  const [presets, setPresets] = useState<readonly AirConditionerPreset[]>([])
  const [loadError, setLoadError] = useState<PresetClientError>()
  const [isReloading, setIsReloading] = useState(false)
  const [isMutating, setIsMutating] = useState(false)

  const applyLoadResult = (result: PresetClientResult): void => {
    if (result.ok) {
      setLoadError(undefined)
      setPresets(result.presets)
      return
    }
    setLoadError(result.error)
  }

  const handleInitialLoad = useEffectEvent(applyLoadResult)

  useEffect(() => {
    let isActive = true
    void loadPresets(applianceCode).then((result) => {
      if (isActive) {
        handleInitialLoad(result)
      }
    })
    return () => {
      isActive = false
    }
  }, [applianceCode])

  const reload = async (): Promise<void> => {
    if (isReloading) {
      return
    }
    setIsReloading(true)
    const result = await loadPresets(applianceCode)
    setIsReloading(false)
    applyLoadResult(result)
  }

  const mutate = async (
    send: () => Promise<PresetClientResult>
  ): Promise<PresetClientError | undefined> => {
    setIsMutating(true)
    const result = await send()
    setIsMutating(false)
    if (!result.ok) {
      if (result.error === 'fileUnreadable') {
        setLoadError(result.error)
      }
      return result.error
    }
    applyLoadResult(result)
    return undefined
  }

  return {
    presets,
    loadError,
    isReloading,
    isMutating,
    reload,
    saveCurrent: (name) => mutate(() => saveCurrentAsPreset(applianceCode, name)),
    rename: (presetId, name) => mutate(() => renamePreset(applianceCode, presetId, name)),
    overwrite: (presetId) => mutate(() => overwritePreset(applianceCode, presetId)),
    remove: (presetId) => mutate(() => removePreset(applianceCode, presetId))
  }
}
