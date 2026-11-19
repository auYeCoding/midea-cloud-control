import { Toggle } from '@renderer/components/ui/toggle'

/**
 * IconToggleTile 的属性.
 */
interface IconToggleTileProps {
  /**
   * 图标.
   */
  readonly icon: React.ReactNode
  /**
   * 文字标签, 同时作为开关的无障碍名称.
   */
  readonly label: string
  /**
   * 是否开启.
   */
  readonly isPressed: boolean
  /**
   * 是否可操作.
   */
  readonly isEnabled: boolean
  /**
   * 切换后的回调, 参数为目标状态.
   */
  readonly onChange: (isPressed: boolean) => void
}

/**
 * 图标方块开关: 图标在上, 文字在下; 开启时图标与文字转为强调色并带浅色底, 按下时轻微缩小.
 * 不可操作时整体变淡.
 * @param props 组件属性.
 * @returns 开关元素.
 */
export function IconToggleTile({
  icon,
  label,
  isPressed,
  isEnabled,
  onChange
}: IconToggleTileProps): React.JSX.Element {
  return (
    <Toggle
      pressed={isPressed}
      disabled={!isEnabled}
      onPressedChange={onChange}
      className="block-auto min-inline-0 flex-col gap-0.5 px-1 py-1.5 short:flex-row short:gap-1.5 short:py-1 text-xs font-normal text-muted-foreground duration-200 ease-out aria-pressed:bg-emphasis-muted! aria-pressed:text-emphasis motion-safe:active:scale-95"
    >
      {icon}
      <span className="max-inline-full truncate">{label}</span>
    </Toggle>
  )
}
