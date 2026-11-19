import { Droplets, Snowflake, Sparkles, Sun, Wind, type LucideIcon } from 'lucide-react'

import type { AirConditionerMode } from '../../../../shared/air-conditioner'

/**
 * 各运行模式对应的图标, 模式选择与设备卡片共用.
 */
export const MODE_ICONS: Readonly<Record<AirConditionerMode, LucideIcon>> = {
  auto: Sparkles,
  cool: Snowflake,
  heat: Sun,
  dry: Droplets,
  fan: Wind
}
