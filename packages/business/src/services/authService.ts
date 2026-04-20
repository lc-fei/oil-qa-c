import { createApiClient, createAuthApi } from '@oil-qa-c/api';
import { getTokenStorage } from '@oil-qa-c/shared';
import { useAuthStore } from '@oil-qa-c/store';
import { createAnonymousAuthState, createAuthenticatedState, createExpiredAuthState } from '@oil-qa-c/wasm-sdk';

const tokenStorage = getTokenStorage();
const authApi = createAuthApi(
  createApiClient({
    getToken: () => tokenStorage.getToken(),
  }),
);

export const authService = {
  // 登录成功后统一写入 token，并立即补拉当前用户，避免页面层自己拼接这条链路。
  async login(payload: Parameters<typeof authApi.login>[0]) {
    const loginResult = await authApi.login(payload);
    tokenStorage.setToken(loginResult.token);

    const currentUser = await authApi.getCurrentUser();
    useAuthStore.getState().setDomainState(createAuthenticatedState(loginResult.token, currentUser));
    return currentUser;
  },
  async restoreSession() {
    const token = tokenStorage.getToken();

    if (!token) {
      useAuthStore.getState().setDomainState(createAnonymousAuthState());
      return null;
    }

    try {
      const currentUser = await authApi.getCurrentUser();
      useAuthStore.getState().setDomainState(createAuthenticatedState(token, currentUser));
      return currentUser;
    } catch (error) {
      tokenStorage.clearToken();
      useAuthStore.getState().setDomainState(createExpiredAuthState());
      throw error;
    }
  },
  getCurrentUser: authApi.getCurrentUser,
  async logout() {
    try {
      await authApi.logout();
    } finally {
      tokenStorage.clearToken();
      useAuthStore.getState().setDomainState(createAnonymousAuthState());
    }
  },
};
