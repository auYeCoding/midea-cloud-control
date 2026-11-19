import { useState } from 'react'

/**
 * 单值滑块的草稿状态与事件处理.
 */
export interface SliderDraft {
  /**
   * 滑块与读数当前显示的值: 拖动中为草稿值, 否则为外部传入的值.
   */
  readonly shownValue: number
  /**
   * 交给滑块 onValueChange: 拖动时只更新草稿.
   */
  readonly handleValueChange: (values: number[]) => void
  /**
   * 交给滑块 onValueCommit: 松手 (或键盘调节结束) 时清除草稿, 值变化时提交一次.
   */
  readonly handleValueCommit: (values: number[]) => void
}

/**
 * 管理 "拖动只改草稿, 松手才提交" 的单值滑块.
 * @param value 外部确认的当前值.
 * @param onCommit 松手后值发生变化时调用, 参数为新值.
 * @returns 草稿状态与事件处理.
 */
export function useSliderDraft(value: number, onCommit: (value: number) => void): SliderDraft {
  const [draftValue, setDraftValue] = useState<number>()

  const handleValueChange = ([nextValue]: number[]): void => {
    setDraftValue(nextValue)
  }

  const handleValueCommit = ([nextValue]: number[]): void => {
    setDraftValue(undefined)
    if (nextValue !== value) {
      onCommit(nextValue)
    }
  }

  return { shownValue: draftValue ?? value, handleValueChange, handleValueCommit }
}
