import type { CurrentUser, LoginRequest, LoginResponse } from '@oil-qa-c/shared';
import type { ApiClient } from '../client';

export function createAuthApi(client: ApiClient) {
  return {
    // 登录和获取当前用户是后续应用启动链路的基础能力。
    login(payload: LoginRequest) {
      return client.post<LoginRequest, LoginResponse>('/api/auth/login', payload);
    },
    getCurrentUser() {
      return client.get<CurrentUser>('/api/auth/me');
    },
    logout() {
      return client.post<Record<string, never>, void>('/api/auth/logout', {});
    },
  };
}
