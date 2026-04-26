import { useAuthStore } from '@oil-qa-c/store';
import { loginWithSdk, logoutWithSdk, restoreAuthSessionWithSdk } from '@oil-qa-c/wasm-sdk';

export const authService = {
  // 页面层只调用业务入口，认证请求、token 存储和领域状态推进都由 SDK 统一编排。
  async login(payload: { account: string; password: string }) {
    const domainState = await loginWithSdk(payload.account, payload.password);
    // store 只镜像 SDK 给出的认证快照，避免页面层自行判断登录状态。
    useAuthStore.getState().setDomainState(domainState);
    return domainState.currentUser;
  },
  async restoreSession() {
    const domainState = await restoreAuthSessionWithSdk();
    // 刷新页面时必须先恢复 SDK 内认证态，再让路由守卫判断是否允许进入业务页。
    useAuthStore.getState().setDomainState(domainState);
    return domainState.currentUser;
  },
  async logout() {
    const domainState = await logoutWithSdk();
    // 退出登录由 SDK 清理 token，store 同步匿名态后触发页面跳转。
    useAuthStore.getState().setDomainState(domainState);
    return domainState;
  },
};
