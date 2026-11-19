<div align="center">

<img src="resources/icon.png" width="96" alt="萝卜-美的美居图标" />

# 萝卜-美的美居

**在 Windows 桌面上控制你的美的空调.**

登录美居账号, 查看账号下的空调, 一屏完成开关机, 温度, 模式, 风速, 出风, 风向与各项功能设置, 还能用预设一键切换整组参数.

![Electron](https://img.shields.io/badge/Electron-44-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

</div>

> [!IMPORTANT]
> 本项目是个人开发的非官方客户端, 与美的集团及美居 App 没有任何关联, 也未获得其授权或认可. "美的", "美居" 为其各自权利人的商标. 使用本软件即表示你自行承担使用风险, 请遵守美居服务的相关条款.

## 功能

**账号**

- 短信验证码登录, 账号密码登录.
- 登录状态经系统加密 (Electron `safeStorage`) 保存在本机, 令牌到期前后自动续期, 可随时退出登录.

**设备列表**

- 登录后自动拉取账号下的全部空调, 可手动刷新.
- 每台空调一张卡片: 设定温度, 运行模式, 室内温度, 在线状态; 右上角直接开关机, 底部 "运行预设" 一键切换.
- 卡片网格随窗口尺寸自动排布, 铺满窗口而不出现滚动条.

**空调设置 (一屏完成, 不滚动)**

- 开关机; 圆弧温度滑块 (16 到 30 °C, 0.5 °C 一档), 支持拖动, 点击, 键盘与加减按钮.
- 五种模式: 自动, 制冷, 制热, 抽湿, 送风.
- 风速: 自动风, 或 1% 到 100% 手动调节.
- 出风: 防直吹, 上下摆风, 左右摆风.
- 风向: 上下, 左右各 5 档, 图标直观表示出风角度.
- 功能: 节能, 电辅热, 舒适省电, 智能控温, 屏幕显示, 声音, 干燥防霉, 智能光感.
- 互斥规则在界面与指令上同时生效, 例如关机时只能开机, 电辅热仅制热可用, 选风向档位会自动停止对应方向的摆风.

**预设**

- 每台空调可保存多套预设, 不同空调互相独立.
- 选中一套预设即开机并应用整组参数; 支持改名, 用当前设置更新, 删除.

**体验**

- 自绘无边框标题栏, 亮色与暗色主题.
- 克制的交互动效, 键盘可完整操作, 无障碍语义完整.
- 不做后台轮询, 只在进入页面, 手动刷新与下发指令时与云端通信.

## 下载与安装

发布后可在 [Releases](../../releases) 下载 `midea-cloud-control-<版本>-setup.exe`, 运行后按向导安装, 可自选安装路径. 暂未发布时, 请按下一节从源码打包.

> 主要面向 Windows. macOS 与 Linux 可自行从源码构建, 未经测试.

## 从源码构建

需要 [Node.js](https://nodejs.org/) 22 或更高版本.

```bash
# 安装依赖
npm install

# 开发模式 (Electron + Vite 热更新)
npm run dev

# 代码检查
npm run lint
npm run typecheck

# 打包 Windows 安装包, 产物在 dist 目录
npm run build:win
```

## 技术栈

| 方面     | 选型                                                           |
| -------- | -------------------------------------------------------------- |
| 桌面框架 | Electron, electron-vite 构建, electron-builder 打包 (NSIS)     |
| 界面     | React 19, Tailwind CSS 4, shadcn/ui (Radix), lucide 图标       |
| 路由     | React Router (hash 模式)                                       |
| 国际化   | react-i18next + ICU 消息格式                                   |
| 代码质量 | TypeScript 严格模式, ESLint (含无障碍与前端结构约束), Prettier |

## 架构

```
src/
├─ main/        主进程: 窗口, 云端请求, 签名与加解密, 会话与本地存储
│  ├─ auth/            登录, 续期, 退出
│  ├─ cloud/           云端请求客户端, 签名, 接口封装
│  ├─ air-conditioner/ 空调状态查询与控制, 透传帧编解码, 预设与声音设置存储
│  ├─ devices/         设备列表
│  └─ session/         加密会话存储, 设备标识
├─ preload/     经 contextBridge 向页面暴露受限的 window.api
├─ shared/      主进程, preload 与页面共用的 IPC 通道名与类型 (唯一定义处)
└─ renderer/    页面 (React)
   └─ src/
      ├─ app/         根组件, 路由, 布局, 标题栏
      ├─ features/    业务领域: auth, devices, air-conditioner
      ├─ components/  通用组件与 shadcn/ui 组件
      ├─ lib/         主题, 国际化等适配层
      ├─ styles/      三层设计 token (原始值, 语义, 组件) 与 Tailwind 入口
      └─ locales/     文案资源
```

几个关键设计:

- **凭据不进页面.** 所有云端请求, 签名与加解密都在主进程完成, 页面只能通过 preload 暴露的有限接口调用, 拿不到令牌与密钥.
- **本地加密存储.** 登录会话用操作系统提供的加密能力保存; 预设与声音偏好以 JSON 保存在用户数据目录, 不上传云端.
- **全量控制帧.** 空调控制指令按 "当前完整状态 + 本次改动" 合成整帧下发, 不会误改未操作的设置.
- **单一定义.** IPC 通道, 跨进程类型, 取值范围与互斥规则各自只在一处定义.

## 数据存放位置

| 内容            | 位置                                             |
| --------------- | ------------------------------------------------ |
| 登录会话 (加密) | `%APPDATA%\萝卜-美的美居\session.bin`            |
| 预设            | `%APPDATA%\萝卜-美的美居\ac-presets.json`        |
| 声音偏好        | `%APPDATA%\萝卜-美的美居\ac-sound-settings.json` |

卸载后如需彻底清除, 删除上述目录即可. 开发模式下目录名为 `midea-cloud-control`.

## 许可证

[MIT](LICENSE) © auYeCode
