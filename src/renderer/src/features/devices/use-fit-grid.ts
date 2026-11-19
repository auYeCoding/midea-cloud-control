import { useLayoutEffect, useRef, useState, type RefObject } from 'react'

/**
 * 网格列间与行间的间距, 单位为像素; 与网格容器上的 gap-4 一致.
 */
const GRID_GAP = 16

/**
 * 理想的卡片宽高比 (宽 / 高); 挑选列数时尽量让卡片接近这个比例.
 */
const PREFERRED_CARD_ASPECT = 1.6

/**
 * 卡片能完整显示内容的最小高度, 单位为像素; 铺满后低于它时改为按此高度排列并允许滚动.
 */
export const MIN_CARD_HEIGHT = 176

/**
 * 卡片能完整显示内容的最小宽度, 单位为像素; 低于它的列数不予考虑.
 */
const MIN_CARD_WIDTH = 240

/**
 * 网格的排布结果.
 */
export interface FitGridLayout {
  /**
   * 列数.
   */
  readonly columns: number
  /**
   * 行数.
   */
  readonly rows: number
  /**
   * 是否能在容器内铺满且不需要滚动; 为 false 时各行按最小高度排列.
   */
  readonly fits: boolean
}

/**
 * 计算按给定列数平分容器时每格的尺寸.
 * @param size 容器在该方向上的长度.
 * @param cells 该方向上的格数.
 * @returns 每格长度.
 */
function cellSize(size: number, cells: number): number {
  return (size - GRID_GAP * (cells - 1)) / cells
}

/**
 * 在给定的容器尺寸内为若干张卡片挑选列数: 只考虑卡片不窄于最小宽度的列数, 其中能铺满的方案里
 * 取能放下的理想比例卡片最大的一个; 没有能铺满的方案时取列数最多的一个, 各行按最小高度排列.
 * @param count 卡片数量.
 * @param width 容器宽度.
 * @param height 容器高度.
 * @returns 排布结果.
 */
function chooseLayout(count: number, width: number, height: number): FitGridLayout {
  let best: FitGridLayout | undefined
  let bestScore = -1
  let widest = 1
  for (let columns = 1; columns <= count; columns += 1) {
    const cellWidth = cellSize(width, columns)
    if (cellWidth < MIN_CARD_WIDTH && columns > 1) {
      break
    }
    widest = columns
    const rows = Math.ceil(count / columns)
    const cellHeight = cellSize(height, rows)
    const score = Math.min(cellWidth / PREFERRED_CARD_ASPECT, cellHeight)
    if (cellHeight >= MIN_CARD_HEIGHT && score > bestScore) {
      bestScore = score
      best = { columns, rows, fits: true }
    }
  }
  return best ?? { columns: widest, rows: Math.ceil(count / widest), fits: false }
}

/**
 * 观察网格容器的尺寸, 随窗口变化为卡片挑选列数与行数, 使卡片铺满容器而不产生滚动条;
 * 卡片多到铺满后低于最小高度时, 退回按最小高度排列.
 * @param count 卡片数量.
 * @returns 要挂到网格容器上的 ref 与当前排布.
 */
export function useFitGrid(count: number): {
  readonly containerRef: RefObject<HTMLDivElement | null>
  readonly layout: FitGridLayout
} {
  const containerRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState<FitGridLayout>({ columns: 1, rows: 1, fits: true })

  useLayoutEffect(() => {
    const container = containerRef.current
    if (container === null || count === 0) {
      return
    }
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setLayout(chooseLayout(count, width, height))
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [count])

  return { containerRef, layout }
}
