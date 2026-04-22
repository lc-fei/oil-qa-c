import { useAuthStore } from '@oil-qa-c/store';
import { loginWithSdk, logoutWithSdk, restoreAuthSessionWithSdk } from '@oil-qa-c/wasm-sdk';

export const authService = {
  // 页面层只调用业务入口，认证请求、token 存储和领域状态推进都由 SDK 统一编排。
  async login(payload: { account: string; password: string }) {
    const domainState = await loginWithSdk(payload.account, payload.password);
    useAuthStore.getState().setDomainState(domainState);
    return domainState.currentUser;
  },
  async restoreSession() {
    const domainState = await restoreAuthSessionWithSdk();
    useAuthStore.getState().setDomainState(domainState);
    return domainState.currentUser;
  },
  async logout() {
    const domainState = await logoutWithSdk();
    useAuthStore.getState().setDomainState(domainState);
    return domainState;
  },
};
