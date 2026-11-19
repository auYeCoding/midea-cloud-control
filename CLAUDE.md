# CLAUDE.md

本文件为在本仓库工作的 Claude Code 提供项目上下文.

## 项目概览

midea-cloud-control: 美的美居桌面客户端, Electron + React + TypeScript, 用 electron-vite 构建, electron-builder 打包.

- `src/main`: 主进程 (窗口, 应用生命周期).
- `src/preload`: preload 脚本, 经 contextBridge 向渲染进程暴露 `window.electron` 与 `window.api`.
- `src/renderer`: 渲染进程, 前端根为 `src/renderer/src`, 别名 `@renderer/*`.
- `src/shared`: 主进程, preload 与渲染进程共用的 IPC 通道名与接口类型 (唯一定义处).
- 窗口无系统边框 (`frame: false`), 标题栏与窗口控制按钮由 `app/title-bar` 自绘, 经 `window.api.windowControls` 调用主进程; 拖动区域用 `app-region-drag` / `app-region-no-drag` 工具类.

## 常用命令

- `npm run dev`: 启动开发 (Electron + Vite dev server, 端口 5173).
- `npm run lint`: ESLint (含前端骨架硬约束).
- `npm run typecheck`: node 与 web 两套 tsconfig 的类型检查.
- `npm run build`: 类型检查 + electron-vite 构建.
- `npm run build:win`: 打包 Windows 安装包.
- `npm run format`: Prettier 格式化 (单引号, 无分号, 100 列).

## 前端骨架规范

前端骨架的单一事实源是 `.claude/frontend-skeleton.json` (前端根, zone, off-limits, token 文件); ESLint 配置与 Claude Hooks 都从它读取路径. 完整方案见 `docs/前端骨架方案.md`.

### 技术栈

React 19 + Tailwind CSS v4 + shadcn/ui (Radix, style `radix-nova`) + react-i18next (ICU) + react-router (hash 模式). 不引全局状态库, 少量全局态用 React Context.

### 目录 (均在 `src/renderer/src` 下)

- `app/`: 根组件, provider, 路由 (`router.tsx`), 布局 (`layouts/`).
- `features/`: 按业务领域切分, 每个领域自包含.
- `components/ui/`: shadcn/ui 生成的库源码, 用 `npx shadcn@latest add <组件>` 拉入, 保持上游原样.
- `components/`: 基于库封装的项目通用组件.
- `hooks/`, `lib/`, `types/`: 通用 hooks, 第三方封装与适配层 (主题 `lib/theme`, i18n `lib/i18n`), 通用类型.
- `styles/`: 三层 token 与 Tailwind 入口 `theme.css`.
- `locales/`: i18n 文案资源.

### 硬约束 (ESLint 确定性执行)

- 依赖单向: `app` -> `features` -> 共享层, 反向禁止; feature 之间禁止直接引用.
- 渲染进程禁止引用 `src/main` 与 `src/preload`.
- 禁止引用原始值 token 文件 `styles/tokens.primitives.css`.
- 禁裸原生交互元素 (`button`, `input`, `select`, `textarea`, `a`), 使用 `components` 中的封装组件 (`components/ui` 除外).
- 禁 Tailwind 任意值 (`p-[13px]` 等); 禁未注册的类名 (Tailwind 默认调色板已清空, 颜色类只来自语义 token); 必须用逻辑属性类 (`ms-*` 而非 `ml-*`).
- jsx-a11y recommended 无障碍基线.

### 软约束 (lint 无法判定, 必须自觉遵守)

- 同类 UI 相似度高且出现 2 次以上, 必须抽象为可复用组件, 不许复制粘贴.
- 库里有的优先用库, 不够再基于库封装; 禁止用 div + state 手搓与库等价的复合控件.
- 组件先于页面: 页面只从 `components/` 取组件.
- 用户可见文案一律走 i18n, 复数与数字用 ICU 语法.
- 新拉入的 shadcn 组件若使用 Tailwind 默认色 (如 `bg-black/50`), 改为语义 token.
- 全局不使用悬停提示: 不引入 shadcn Tooltip, 不给元素加 `title` 属性; 图标按钮的含义用 `aria-label` 表达.

### token 与主题

- 第 1 层 `tokens.primitives.css`: 唯一允许出现颜色字面量的文件.
- 第 2 层 `tokens.semantic.css`: shadcn/ui 约定的语义变量, 只引用原始值, `.dark` 下换指向.
- 第 3 层 `tokens.components.css`: 组件级特例, 按需添加.
- 主题偏好 system / light / dark 由 `lib/theme` 管理, 存于 localStorage, 在 `<html>` 上切换 `.dark`.
- 当前 token 为中性占位值, 真实视觉值待设计阶段填入.

### Claude Hooks

- `.claude/hooks/inject-frontend-rules.mjs`: 写 `app/`, `features/`, `components/` 下文件前注入 `.claude/frontend-rules.md` 的软约束清单.
- `.claude/hooks/verify-frontend.mjs`: 改动前端根内文件后对该文件运行 ESLint, 失败时回灌结果.
