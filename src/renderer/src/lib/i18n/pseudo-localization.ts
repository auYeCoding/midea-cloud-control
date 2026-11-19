import type { i18n, PostProcessorModule } from 'i18next'

import { PSEUDO_LANGUAGE } from './languages'

/**
 * 伪本地化后处理器的注册名.
 */
export const PSEUDO_POST_PROCESSOR_NAME = 'pseudoLocalization'

/**
 * 模拟其它语言文本膨胀的长度增量比例.
 */
const EXPANSION_RATIO = 0.4

/**
 * 用于填充膨胀长度的字符.
 */
const PADDING_CHARACTER = '~'

/**
 * 拉丁字母到带变音符号字母的映射, 用于暴露编码与字体问题.
 */
const ACCENTED_CHARACTERS: Readonly<Record<string, string>> = {
  a: 'á',
  c: 'ç',
  e: 'é',
  i: 'í',
  n: 'ñ',
  o: 'ö',
  u: 'ü',
  y: 'ý',
  A: 'Å',
  C: 'Ç',
  E: 'É',
  I: 'Î',
  N: 'Ñ',
  O: 'Ö',
  U: 'Ü',
  Y: 'Ý'
}

/**
 * 把一段文案转换为伪本地化形式: 替换变音字母, 按比例加长, 并加上边界符.
 * @param value 原始文案.
 * @returns 伪本地化后的文案.
 */
export function pseudoLocalize(value: string): string {
  const accented = Array.from(value, (character) => ACCENTED_CHARACTERS[character] ?? character)
  const padding = PADDING_CHARACTER.repeat(Math.ceil(accented.length * EXPANSION_RATIO))
  return `[!! ${accented.join('')}${padding} !!]`
}

/**
 * 创建伪本地化后处理器, 仅在当前语言为伪本地化语言时改写文案.
 * @param instance 需要判断当前语言的 i18next 实例.
 * @returns i18next 后处理器模块.
 */
export function createPseudoPostProcessor(instance: i18n): PostProcessorModule {
  return {
    type: 'postProcessor',
    name: PSEUDO_POST_PROCESSOR_NAME,
    process: (value: string): string =>
      instance.language === PSEUDO_LANGUAGE ? pseudoLocalize(value) : value
  }
}
