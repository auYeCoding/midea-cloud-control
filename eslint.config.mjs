import { existsSync, readdirSync, readFileSync } from 'node:fs'

import { defineConfig } from 'eslint/config'
import tseslint from '@electron-toolkit/eslint-config-ts'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import eslintPluginReact from 'eslint-plugin-react'
import eslintPluginReactHooks from 'eslint-plugin-react-hooks'
import eslintPluginReactRefresh from 'eslint-plugin-react-refresh'
import eslintPluginJsxA11y from 'eslint-plugin-jsx-a11y'
import eslintPluginImportX from 'eslint-plugin-import-x'
import eslintPluginBetterTailwindcss from 'eslint-plugin-better-tailwindcss'
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript'

/**
 * 前端骨架清单, 前端根, zone, off-limits 与 token 文件路径的单一事实源.
 * @type {{
 *   frontendRoot: string,
 *   zones: Record<string, string>,
 *   offLimits: string[],
 *   tokenLayers: { primitivesFile: string, tailwindEntry: string }
 * }}
 */
const MANIFEST = JSON.parse(readFileSync('.claude/frontend-skeleton.json', 'utf8'))

/**
 * 前端根内的 TS/TSX 源文件.
 */
const FRONTEND_SOURCE_FILES = [`${MANIFEST.frontendRoot}/**/*.{ts,tsx}`]

/**
 * shadcn/ui 生成的库封装层, 保持上游源码原样, 不受业务层约束.
 */
const UI_LIBRARY_FILES = [`${MANIFEST.zones.ui}/**/*.{ts,tsx}`]

/**
 * 业务与装配层不可从中引用 app 或 features 的共享 zone.
 */
const SHARED_ZONES = ['components', 'hooks', 'lib', 'types', 'locales', 'styles'].map(
  (zone) => MANIFEST.zones[zone]
)

/**
 * 必须改用项目封装组件的原生交互元素.
 */
const FORBIDDEN_NATIVE_ELEMENTS = ['button', 'input', 'select', 'textarea', 'a']

/**
 * 为每个已存在的 feature 生成一条隔离规则: 只能引用自身目录, 不能引用其它 feature.
 * @returns {Array<{ target: string, from: string, except: string[], message: string }>} 隔离规则.
 */
function createFeatureIsolationZones() {
  const featuresDirectory = MANIFEST.zones.features
  if (!existsSync(featuresDirectory)) {
    return []
  }
  return readdirSync(featuresDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      target: `${featuresDirectory}/${entry.name}`,
      from: featuresDirectory,
      except: [`./${entry.name}`],
      message: 'feature 之间禁止直接引用, 共享逻辑请下沉到 components / hooks / lib.'
    }))
}

export default defineConfig(
  { ignores: ['**/node_modules', '**/dist', '**/out', '.claude'] },
  tseslint.configs.recommended,
  eslintPluginReact.configs.flat.recommended,
  eslintPluginReact.configs.flat['jsx-runtime'],
  {
    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': eslintPluginReactHooks,
      'react-refresh': eslintPluginReactRefresh
    },
    rules: {
      ...eslintPluginReactHooks.configs.recommended.rules,
      ...eslintPluginReactRefresh.configs.vite.rules
    }
  },
  {
    files: FRONTEND_SOURCE_FILES,
    extends: [eslintPluginJsxA11y.flatConfigs.recommended],
    plugins: {
      'import-x': eslintPluginImportX
    },
    settings: {
      'import-x/resolver-next': [createTypeScriptImportResolver({ project: 'tsconfig.web.json' })]
    },
    rules: {
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: MANIFEST.frontendRoot,
              from: MANIFEST.offLimits,
              message:
                '渲染进程禁止引用主进程与 preload 源码, 请经 window.electron / window.api 访问.'
            },
            {
              target: SHARED_ZONES,
              from: [MANIFEST.zones.app, MANIFEST.zones.features],
              message: '共享层禁止反向引用 app 或 features.'
            },
            {
              target: MANIFEST.zones.features,
              from: MANIFEST.zones.app,
              message: 'features 禁止引用 app 装配层.'
            },
            {
              target: [
                MANIFEST.zones.app,
                MANIFEST.zones.features,
                MANIFEST.zones.components,
                MANIFEST.zones.hooks,
                MANIFEST.zones.lib
              ],
              from: MANIFEST.tokenLayers.primitivesFile,
              message: '禁止直接引用原始值 token, 请使用语义层 token.'
            },
            ...createFeatureIsolationZones()
          ]
        }
      ]
    }
  },
  {
    files: FRONTEND_SOURCE_FILES,
    ignores: UI_LIBRARY_FILES,
    plugins: {
      'better-tailwindcss': eslintPluginBetterTailwindcss
    },
    settings: {
      'better-tailwindcss': {
        entryPoint: MANIFEST.tokenLayers.tailwindEntry
      }
    },
    rules: {
      'react/forbid-elements': [
        'error',
        {
          forbid: FORBIDDEN_NATIVE_ELEMENTS.map((element) => ({
            element,
            message: `禁止直接使用原生 <${element}>, 请使用 @renderer/components 中的封装组件.`
          }))
        }
      ],
      'better-tailwindcss/no-unknown-classes': 'error',
      'better-tailwindcss/enforce-logical-properties': 'error',
      'better-tailwindcss/no-restricted-classes': [
        'error',
        {
          restrict: [
            {
              pattern: '\\[',
              message: '禁止 Tailwind 任意值, 请使用语义 token 对应的工具类.'
            }
          ]
        }
      ]
    }
  },
  {
    files: UI_LIBRARY_FILES,
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      'react-refresh/only-export-components': 'off'
    }
  },
  eslintConfigPrettier
)
