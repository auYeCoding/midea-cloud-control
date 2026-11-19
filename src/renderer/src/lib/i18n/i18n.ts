import i18next from 'i18next'
import ICU from 'i18next-icu'
import { initReactI18next } from 'react-i18next'

import zhCNCommon from '@renderer/locales/zh-CN/common.json'

import { DEFAULT_LANGUAGE, DEFAULT_NAMESPACE } from './languages'
import { createPseudoPostProcessor, PSEUDO_POST_PROCESSOR_NAME } from './pseudo-localization'

/**
 * 同步根元素的 lang 属性, 让屏幕阅读器与浏览器排版使用正确的语言.
 * @param language 当前语言代码.
 */
function syncDocumentLanguage(language: string): void {
  document.documentElement.lang = language
}

/**
 * 初始化 i18next: 启用 ICU 消息格式, 接入 React, 注册伪本地化后处理器并加载文案资源.
 * @returns 初始化完成后兑现的 Promise.
 */
export async function initializeI18n(): Promise<void> {
  i18next.on('languageChanged', syncDocumentLanguage)
  await i18next
    .use(ICU)
    .use(initReactI18next)
    .use(createPseudoPostProcessor(i18next))
    .init({
      lng: DEFAULT_LANGUAGE,
      fallbackLng: DEFAULT_LANGUAGE,
      defaultNS: DEFAULT_NAMESPACE,
      ns: [DEFAULT_NAMESPACE],
      resources: {
        [DEFAULT_LANGUAGE]: { [DEFAULT_NAMESPACE]: zhCNCommon }
      },
      postProcess: [PSEUDO_POST_PROCESSOR_NAME],
      interpolation: { escapeValue: false }
    })
}
