import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from 'cn'

import { TARGET_TEMPERATURE_RANGE } from '../../../../shared/air-conditioner'

/**
 * 圆弧的几何参数 (图标坐标系为 200 x 170): 圆心, 半径, 起始角与扫过的角度 (度, 0 度朝右, 顺时针为正).
 */
const ARC = { CENTER_X: 100, CENTER_Y: 90, RADIUS: 80, START_ANGLE: 135, SWEEP: 270 } as const

/**
 * 键盘每次按下调整的档数: 方向键 1 档, PageUp / PageDown 2 档 (即 1 度).
 */
const KEY_STEPS: Readonly<Record<string, number>> = {
  ArrowUp: 1,
  ArrowRight: 1,
  ArrowDown: -1,
  ArrowLeft: -1,
  PageUp: 2,
  PageDown: -2
}

/**
 * 把温度限制在可设定范围内并对齐到步进.
 * @param value 任意温度.
 * @returns 合法的设定温度.
 */
function normalizeTemperature(value: number): number {
  const { MIN, MAX, STEP } = TARGET_TEMPERATURE_RANGE
  const snapped = Math.round((value - MIN) / STEP) * STEP + MIN
  return Math.min(MAX, Math.max(MIN, snapped))
}

/**
 * 计算圆弧上某个角度对应的坐标.
 * @param angle 角度 (度).
 * @returns 坐标.
 */
function pointAt(angle: number): { readonly x: number; readonly y: number } {
  const radians = (angle * Math.PI) / 180
  return {
    x: ARC.CENTER_X + ARC.RADIUS * Math.cos(radians),
    y: ARC.CENTER_Y + ARC.RADIUS * Math.sin(radians)
  }
}

/**
 * 生成从起始角扫过给定角度的圆弧路径.
 * @param sweep 扫过的角度 (度).
 * @returns SVG 路径.
 */
function arcPath(sweep: number): string {
  const start = pointAt(ARC.START_ANGLE)
  const end = pointAt(ARC.START_ANGLE + sweep)
  const largeArc = sweep > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${ARC.RADIUS} ${ARC.RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

/**
 * 温度在圆弧上占的比例.
 * @param value 设定温度.
 * @returns 0 到 1 之间的比例.
 */
function toFraction(value: number): number {
  const { MIN, MAX } = TARGET_TEMPERATURE_RANGE
  return (value - MIN) / (MAX - MIN)
}

/**
 * TemperatureDial 的属性.
 */
interface TemperatureDialProps {
  /**
   * 当前设定温度.
   */
  readonly targetTemperature: number
  /**
   * 是否可操作.
   */
  readonly isEnabled: boolean
  /**
   * 拖动结束或键盘松开后下发新温度; 与当前温度相同时不调用.
   */
  readonly onCommit: (targetTemperature: number) => void
  /**
   * 放在圆弧底部缺口处的内容 (如加减按钮); 与圆弧一起等比缩放, 不属于滑块本身.
   */
  readonly footer?: React.ReactNode
  /**
   * 附加样式, 用于控制尺寸.
   */
  readonly className?: string
}

/**
 * 圆弧底部缺口处放置附加内容的区域 (与圆弧同一坐标系): 位于最低, 最高温度两个刻度标签之间.
 */
const FOOTER_AREA = { X: 62, Y: 140, WIDTH: 76, HEIGHT: 30 } as const

/**
 * 圆弧温度滑块: 270 度圆弧表示 16 到 30 度, 中央显示设定温度; 可拖动圆弧或点击圆弧跳到对应温度,
 * 方向键按 0.5 度, PageUp / PageDown 按 1 度调整. 拖动与按键期间只更新显示, 松手或松键后才下发一次.
 * 随容器等比缩放; 不可操作时整体变淡. 底部缺口可放附加内容, 叠在一张同坐标系的透明图层上, 与滑块分开,
 * 点击附加内容不会改变温度.
 * @param props 组件属性.
 * @returns 滑块元素.
 */
export function TemperatureDial({
  targetTemperature,
  isEnabled,
  onCommit,
  footer,
  className
}: TemperatureDialProps): React.JSX.Element {
  const { t } = useTranslation()
  const svgRef = useRef<SVGSVGElement>(null)
  const [draft, setDraft] = useState<number>()
  const shownTemperature = draft ?? targetTemperature
  const thumb = pointAt(ARC.START_ANGLE + ARC.SWEEP * toFraction(shownTemperature))

  const temperatureFromPointer = (event: React.PointerEvent<SVGSVGElement>): number | undefined => {
    const svg = svgRef.current
    if (svg === null) {
      return undefined
    }
    const bounds = svg.getBoundingClientRect()
    const scale = bounds.width / 200
    const x = (event.clientX - bounds.left) / scale - ARC.CENTER_X
    const y = (event.clientY - bounds.top) / scale - ARC.CENTER_Y
    const angle = (Math.atan2(y, x) * 180) / Math.PI
    const offset = (((angle - ARC.START_ANGLE) % 360) + 360) % 360
    const clampedOffset =
      offset > ARC.SWEEP ? (offset > (ARC.SWEEP + 360) / 2 ? 0 : ARC.SWEEP) : offset
    const { MIN, MAX } = TARGET_TEMPERATURE_RANGE
    return normalizeTemperature(MIN + (clampedOffset / ARC.SWEEP) * (MAX - MIN))
  }

  const commit = (value: number): void => {
    setDraft(undefined)
    if (value !== targetTemperature) {
      onCommit(value)
    }
  }

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>): void => {
    if (!isEnabled) {
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.focus()
    setDraft(temperatureFromPointer(event))
  }

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>): void => {
    if (draft !== undefined && event.currentTarget.hasPointerCapture(event.pointerId)) {
      setDraft(temperatureFromPointer(event))
    }
  }

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>): void => {
    if (draft !== undefined) {
      commit(temperatureFromPointer(event) ?? draft)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<SVGSVGElement>): void => {
    const steps = KEY_STEPS[event.key]
    if (!isEnabled || steps === undefined) {
      return
    }
    event.preventDefault()
    setDraft(normalizeTemperature(shownTemperature + steps * TARGET_TEMPERATURE_RANGE.STEP))
  }

  const handleKeyUp = (): void => {
    if (draft !== undefined) {
      commit(draft)
    }
  }

  return (
    <div className={cn('relative', className)}>
      <svg
        ref={svgRef}
        viewBox="0 0 200 170"
        role="slider"
        tabIndex={isEnabled ? 0 : -1}
        aria-label={t('airConditioner.targetTemperature')}
        aria-valuemin={TARGET_TEMPERATURE_RANGE.MIN}
        aria-valuemax={TARGET_TEMPERATURE_RANGE.MAX}
        aria-valuenow={shownTemperature}
        aria-valuetext={t('airConditioner.temperatureValue', { value: shownTemperature })}
        aria-disabled={!isEnabled}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        className={cn(
          'absolute inset-0 block-full inline-full touch-none rounded-xl outline-none select-none focus-visible:ring-1 focus-visible:ring-ring/50',
          isEnabled ? 'cursor-pointer' : 'opacity-50'
        )}
      >
        <path
          d={arcPath(ARC.SWEEP)}
          className="fill-none stroke-muted"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d={arcPath(Math.max(ARC.SWEEP * toFraction(shownTemperature), 0.01))}
          className="fill-none stroke-primary"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <circle
          cx={thumb.x}
          cy={thumb.y}
          r="9"
          className="fill-card stroke-primary"
          strokeWidth="3"
        />
        <text
          x={ARC.CENTER_X}
          y={ARC.CENTER_Y + 8}
          textAnchor="middle"
          className="fill-foreground text-5xl font-medium tabular-nums"
        >
          {shownTemperature.toFixed(1)}
        </text>
        <text
          x={ARC.CENTER_X}
          y={ARC.CENTER_Y + 32}
          textAnchor="middle"
          className="fill-muted-foreground text-xs"
        >
          {t('airConditioner.quick.temperatureUnit')}
        </text>
        <text
          x={pointAt(ARC.START_ANGLE).x}
          y={pointAt(ARC.START_ANGLE).y + 20}
          textAnchor="middle"
          className="fill-muted-foreground text-xs tabular-nums"
        >
          {TARGET_TEMPERATURE_RANGE.MIN}
        </text>
        <text
          x={pointAt(ARC.START_ANGLE + ARC.SWEEP).x}
          y={pointAt(ARC.START_ANGLE + ARC.SWEEP).y + 20}
          textAnchor="middle"
          className="fill-muted-foreground text-xs tabular-nums"
        >
          {TARGET_TEMPERATURE_RANGE.MAX}
        </text>
      </svg>
      {footer !== undefined && (
        <svg
          viewBox="0 0 200 170"
          className="pointer-events-none absolute inset-0 block-full inline-full"
        >
          <foreignObject
            x={FOOTER_AREA.X}
            y={FOOTER_AREA.Y}
            width={FOOTER_AREA.WIDTH}
            height={FOOTER_AREA.HEIGHT}
            className="pointer-events-auto"
          >
            <div className="flex block-full scale-60 items-center justify-center gap-2">
              {footer}
            </div>
          </foreignObject>
        </svg>
      )}
    </div>
  )
}
