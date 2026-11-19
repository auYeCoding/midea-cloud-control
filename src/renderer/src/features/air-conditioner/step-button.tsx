import { Minus, Plus } from 'lucide-react'

import { Button } from '@renderer/components/ui/button'

/**
 * StepButton 的属性.
 */
interface StepButtonProps {
  /**
   * 方向: 1 为加, -1 为减.
   */
  readonly direction: 1 | -1
  /**
   * 无障碍名称 (如 "升高温度").
   */
  readonly label: string
  /**
   * 是否可操作.
   */
  readonly isEnabled: boolean
  /**
   * 点击回调.
   */
  readonly onStep: (direction: 1 | -1) => void
}

/**
 * 圆形加减按钮: 加号或减号图标, 按下时轻微缩小.
 * @param props 组件属性.
 * @returns 按钮元素.
 */
export function StepButton({
  direction,
  label,
  isEnabled,
  onStep
}: StepButtonProps): React.JSX.Element {
  const Icon = direction === 1 ? Plus : Minus

  return (
    <Button
      variant="outline"
      size="icon-sm"
      aria-label={label}
      disabled={!isEnabled}
      onClick={() => onStep(direction)}
      className="shrink-0 rounded-full motion-safe:active:scale-90"
    >
      <Icon aria-hidden />
    </Button>
  )
}
