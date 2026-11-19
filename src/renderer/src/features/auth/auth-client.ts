import type { AuthApi } from '../../../../shared/auth'

/**
 * 非 Electron 环境 (如浏览器预览) 下的空实现: 登录与发送验证码总是失败, 始终视为未登录, 退出登录直接完成.
 */
const DETACHED_AUTH: AuthApi = {
  loginWithPassword: () => Promise.resolve({ ok: false }),
  sendSmsCode: () => Promise.resolve({ ok: false }),
  loginWithSmsCode: () => Promise.resolve({ ok: false }),
  isLoggedIn: () => Promise.resolve(false),
  logout: () => Promise.resolve()
}

/**
 * 渲染进程访问登录能力的唯一入口, 屏蔽 preload 桥是否存在的差异.
 */
export const authClient: AuthApi = window.api?.auth ?? DETACHED_AUTH
