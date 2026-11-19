import { cn } from 'cn'

/**
 * 风向轴: 上下 (出风口侧立, 刻度线向左展开) 或左右 (出风口横置, 刻度线向下展开).
 */
export type AirflowAxis = 'vertical' | 'horizontal'

/**
 * 五条刻度线相对出风方向的偏转角度 (度), 顺序与档位顺序一致: 顶部到底部, 或最左到最右.
 */
const TICK_ANGLES = [-40, -20, 0, 20, 40] as const

/**
 * 普通刻度线的内外半径.
 */
const TICK_RADIUS = { INNER: 5, OUTER: 11 } as const

/**
 * 当前档位刻度线的内外半径, 比普通刻度线更长.
 */
const ACTIVE_TICK_RADIUS = { INNER: 4, OUTER: 13 } as const

/**
 * 各轴刻度线扇形的中心点 (图标坐标系为 44 x 44).
 */
const FAN_CENTERS: Readonly<Record<AirflowAxis, { readonly x: number; readonly y: number }>> = {
  vertical: { x: 24, y: 22 },
  horizontal: { x: 22, y: 20 }
}

/**
 * 计算某条刻度线的方向向量: 上下轴朝左展开, 左右轴朝下展开.
 * @param axis 风向轴.
 * @param angle 偏转角度 (度).
 * @returns 单位方向向量.
 */
function tickDirection(
  axis: AirflowAxis,
  angle: number
): { readonly x: number; readonly y: number } {
  const radians = (angle * Math.PI) / 180
  return axis === 'vertical'
    ? { x: -Math.cos(radians), y: Math.sin(radians) }
    : { x: Math.sin(radians), y: Math.cos(radians) }
}

/**
 * AirflowDirectionIcon 的属性.
 */
interface AirflowDirectionIconProps {
  /**
   * 风向轴.
   */
  readonly axis: AirflowAxis
  /**
   * 图标代表的档位序号 (0 到 4).
   */
  readonly level: number
  /**
   * 附加样式.
   */
  readonly className?: string
}

/**
 * 风向档位图标: 出风口与固定的五条刻度线, 该图标代表的档位那一条更长更粗并完全不透明, 其余为浅色;
 * 颜色取自当前文字颜色, 由外层按钮决定选中与否.
 * @param props 组件属性.
 * @returns 图标元素.
 */
export function AirflowDirectionIcon({
  axis,
  level,
  className
}: AirflowDirectionIconProps): React.JSX.Element {
  const center = FAN_CENTERS[axis]

  return (
    <svg viewBox="0 0 44 44" aria-hidden className={cn('shrink-0', className)}>
      {axis === 'vertical' ? (
        <rect
          x="27"
          y="8"
          width="9"
          height="28"
          rx="3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
        />
      ) : (
        <rect
          x="8"
          y="8"
          width="28"
          height="9"
          rx="3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
        />
      )}
      {TICK_ANGLES.map((angle, index) => {
        const isActive = index === level
        const radius = isActive ? ACTIVE_TICK_RADIUS : TICK_RADIUS
        const direction = tickDirection(axis, angle)
        return (
          <line
            key={angle}
            x1={center.x + direction.x * radius.INNER}
            y1={center.y + direction.y * radius.INNER}
            x2={center.x + direction.x * radius.OUTER}
            y2={center.y + direction.y * radius.OUTER}
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth={isActive ? 2.8 : 2}
            opacity={isActive ? 1 : 0.28}
          />
        )
      })}
    </svg>
  )
}

/**
 * 出风图标的属性.
 */
interface AirflowGlyphProps {
  /**
   * 附加样式.
   */
  readonly className?: string
}

/**
 * 防直吹图标: 横置出风口下方的弧形绕流.
 * @param props 组件属性.
 * @returns 图标元素.
 */
export function PreventStraightWindIcon({ className }: AirflowGlyphProps): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 34 34"
      aria-hidden
      className={cn('shrink-0', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
    >
      <rect x="5" y="5" width="24" height="7" rx="2.5" />
      <path d="M8 18 Q17 28 26 18" />
      <path d="M11 29 L23 29" opacity="0.4" />
    </svg>
  )
}

/**
 * 上下摆风图标: 侧立出风口旁的上下往复箭头.
 * @param props 组件属性.
 * @returns 图标元素.
 */
export function SwingUpDownIcon({ className }: AirflowGlyphProps): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 34 34"
      aria-hidden
      className={cn('shrink-0', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="22" y="4" width="7" height="26" rx="2.5" />
      <path d="M14 7 Q6 17 14 27" />
      <path d="M10.5 7 L14 7 L14 10.5" />
      <path d="M10.5 27 L14 27 L14 23.5" />
    </svg>
  )
}

/**
 * 左右摆风图标: 横置出风口下方的左右往复箭头.
 * @param props 组件属性.
 * @returns 图标元素.
 */
export function SwingLeftRightIcon({ className }: AirflowGlyphProps): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 34 34"
      aria-hidden
      className={cn('shrink-0', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="5" width="26" height="7" rx="2.5" />
      <path d="M7 22 Q17 30 27 22" />
      <path d="M7 18.5 L7 22 L10.5 22" />
      <path d="M27 18.5 L27 22 L23.5 22" />
    </svg>
  )
}
