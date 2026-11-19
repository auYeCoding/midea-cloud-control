import type { PresetClientError } from './preset-client'

/**
 * 各预设操作失败原因对应的提示文案的 i18n 键; 文案中的 {max} 为名称长度上限.
 */
export const PRESET_ERROR_KEYS = {
  emptyName: 'airConditioner.presets.errors.emptyName',
  nameTooLong: 'airConditioner.presets.errors.nameTooLong',
  duplicateName: 'airConditioner.presets.errors.duplicateName',
  notFound: 'airConditioner.presets.errors.notFound',
  statusUnavailable: 'airConditioner.presets.errors.statusUnavailable',
  storageFailed: 'airConditioner.presets.errors.storageFailed',
  fileUnreadable: 'airConditioner.presets.errors.fileUnreadable',
  invocationFailed: 'airConditioner.presets.errors.invocationFailed'
} as const satisfies Record<PresetClientError, string>
