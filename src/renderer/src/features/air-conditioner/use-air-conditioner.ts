import { useEffect, useEffectEvent, useState } from 'react'

import type {
  AirConditionerControl,
  AirConditionerStatus,
  AirConditionerStatusResult
} from '../../../../shared/air-conditioner'
import type { AirConditionerPreset } from '../../../../shared/air-conditioner-presets'
import { loadAirConditionerStatus, sendAirConditionerControl } from './air-conditioner-client'
import { applyPreset as applyPresetById } from './preset-client'

/**
 * 设置页最近一次失败的操作及云端原因.
 */
export interface AirConditionerFailure {
  /**
   * 失败的操作: 同步状态, 下发控制或应用预设.
   */
  readonly operation: 'load' | 'control' | 'applyPreset'
  /**
   * 云端返回的错误描述; 未给出时为 undefined.
   */
  readonly cloudMessage?: string
}

/**
 * 设置页的空调状态与操作.
 */
export interface AirConditionerController {
  /**
   * 界面展示的状态: 控制进行中时叠加了本次变更, 否则为最近一次云端确认的状态; 尚未同步成功时为 undefined.
   */
  readonly status?: AirConditionerStatus
  /**
   * 是否正在同步状态.
   */
  readonly isLoading: boolean
  /**
   * 是否有控制正在下发.
   */
  readonly isControlling: boolean
  /**
   * 最近一次失败; 之后的操作开始时清除.
   */
  readonly failure?: AirConditionerFailure
  /**
   * 重新从云端同步状态; 同步或控制进行中时忽略.
   */
  readonly refresh: () => Promise<void>
  /**
   * 下发一次控制; 同步或控制进行中时忽略. 结果为 true 表示云端确认成功.
   */
  readonly control: (control: AirConditionerControl) => Promise<boolean>
  /**
   * 应用一套预设 (开机并切换到预设的全部设置); 同步或控制进行中时忽略. 结果为 true 表示云端确认成功.
   */
  readonly applyPreset: (preset: AirConditionerPreset) => Promise<boolean>
}

/**
 * 管理一台空调的状态同步与控制 (含应用预设): 进入时自动同步一次; 控制期间先在界面上显示目标值,
 * 成功后以控制回帧的状态为准; 失败时记录原因, 并以失败结果所带的主进程已知最新状态为准,
 * 没有时回到云端最近一次确认的状态.
 * @param applianceCode 设备唯一标识.
 * @param onSessionExpired 登录会话失效且无法续期时的回调, 参数为云端原因.
 * @returns 状态与操作.
 */
export function useAirConditioner(
  applianceCode: string,
  onSessionExpired: (cloudMessage: string | undefined) => void
): AirConditionerController {
  const [confirmedStatus, setConfirmedStatus] = useState<AirConditionerStatus>()
  const [isLoading, setIsLoading] = useState(true)
  const [pendingControl, setPendingControl] = useState<AirConditionerControl>()
  const [failure, setFailure] = useState<AirConditionerFailure>()

  const applyResult = (
    result: AirConditionerStatusResult,
    operation: AirConditionerFailure['operation']
  ): void => {
    if (result.ok) {
      setConfirmedStatus(result.status)
      return
    }
    if (result.isSessionExpired === true) {
      onSessionExpired(result.cloudMessage)
      return
    }
    if (result.status !== undefined) {
      setConfirmedStatus(result.status)
    }
    setFailure({ operation, cloudMessage: result.cloudMessage })
  }

  const handleInitialLoad = useEffectEvent((result: AirConditionerStatusResult) => {
    setIsLoading(false)
    applyResult(result, 'load')
  })

  useEffect(() => {
    let isActive = true
    void loadAirConditionerStatus(applianceCode).then((result) => {
      if (isActive) {
        handleInitialLoad(result)
      }
    })
    return () => {
      isActive = false
    }
  }, [applianceCode])

  const isBusy = isLoading || pendingControl !== undefined

  const refresh = async (): Promise<void> => {
    if (isBusy) {
      return
    }
    setIsLoading(true)
    setFailure(undefined)
    const result = await loadAirConditionerStatus(applianceCode)
    setIsLoading(false)
    applyResult(result, 'load')
  }

  const runControl = async (
    change: AirConditionerControl,
    send: () => Promise<AirConditionerStatusResult>,
    operation: AirConditionerFailure['operation']
  ): Promise<boolean> => {
    if (isBusy || confirmedStatus === undefined) {
      return false
    }
    setPendingControl(change)
    setFailure(undefined)
    const result = await send()
    setPendingControl(undefined)
    applyResult(result, operation)
    return result.ok
  }

  const control = (change: AirConditionerControl): Promise<boolean> =>
    runControl(change, () => sendAirConditionerControl(applianceCode, change), 'control')

  const applyPreset = (preset: AirConditionerPreset): Promise<boolean> =>
    runControl(
      { ...preset.settings, isPoweredOn: true },
      () => applyPresetById(applianceCode, preset.id),
      'applyPreset'
    )

  const status =
    confirmedStatus === undefined ? undefined : { ...confirmedStatus, ...pendingControl }

  return {
    status,
    isLoading,
    isControlling: pendingControl !== undefined,
    failure,
    refresh,
    control,
    applyPreset
  }
}
