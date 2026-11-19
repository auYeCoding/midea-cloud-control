/**
 * 默认语言, 同时作为缺失文案时的回退语言.
 */
export const DEFAULT_LANGUAGE = 'zh-CN'

/**
 * 伪本地化语言代码, 仅开发环境可用, 用于暴露漏翻文案与文本膨胀问题.
 */
export const PSEUDO_LANGUAGE = 'pseudo'

/**
 * 当前构建可切换的语言列表, 伪本地化只在开发环境提供.
 */
export const AVAILABLE_LANGUAGES: readonly string[] = import.meta.env.DEV
  ? [DEFAULT_LANGUAGE, PSEUDO_LANGUAGE]
  : [DEFAULT_LANGUAGE]

/**
 * 默认命名空间.
 */
export const DEFAULT_NAMESPACE = 'common'
