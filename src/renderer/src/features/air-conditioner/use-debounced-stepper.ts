import { useEffect, useRef, useState } from 'react'

/**
 * 连续点击加减按钮后, 停顿多久才下发, 单位为毫秒; 连点期间只更新显示, 避免每点一次就下发一条指令.
 */
const COMMIT_DELAY_MS = 600

/**
 * 步进的取值范围与步长.
 */
export interface StepperRange {
  /**
   * 最小值.
   */
  readonly min: number
  /**
   * 最大值.
   */
  readonly max: number
  /**
   * 每次点击的步长.
   */
  readonly step: number
}

/**
 * 加减按钮的显示值与操作.
 */
export interface DebouncedStepper {
  /**
   * 界面显示的值: 连点期间为累计后的待下发值, 否则为当前值.
   */
  readonly shownValue: number
  /**
   * 是否还能减小.
   */
  readonly canDecrease: boolean
  /**
   * 是否还能增大.
   */
  readonly canIncrease: boolean
  /**
   * 按一个步长增大 (1) 或减小 (-1).
   */
  readonly stepBy: (direction: 1 | -1) => void
}

/**
 * 管理加减按钮: 每次点击在显示值上累加一个步长 (限制在范围内并对齐步长), 停止点击一段时间后才下发一次;
 * 最终值与当前值相同时不下发. 组件卸载时取消尚未下发的值.
 * @param value 当前值.
 * @param range 取值范围与步长.
 * @param onCommit 下发新值.
 * @returns 显示值与操作.
 */
export function useDebouncedStepper(
  value: number,
  range: StepperRange,
  onCommit: (value: number) => void
): DebouncedStepper {
  const [pendingValue, setPendingValue] = useState<number>()
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const shownValue = pendingValue ?? value

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const stepBy = (direction: 1 | -1): void => {
    const stepped = Math.round((shownValue + direction * range.step) / range.step) * range.step
    const nextValue = Math.min(range.max, Math.max(range.min, stepped))
    setPendingValue(nextValue)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setPendingValue(undefined)
      if (nextValue !== value) {
        onCommit(nextValue)
      }
    }, COMMIT_DELAY_MS)
  }

  return {
    shownValue,
    canDecrease: shownValue > range.min,
    canIncrease: shownValue < range.max,
    stepBy
  }
}
