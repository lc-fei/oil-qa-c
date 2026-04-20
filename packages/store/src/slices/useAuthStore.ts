import { create } from 'zustand';
import type { AuthDomainState, CurrentUser } from '@oil-qa-c/shared';

interface AuthState {
  token: string | null;
  currentUser: CurrentUser | null;
  isAuthenticated: boolean;
  domainState: AuthDomainState;
  setToken: (token: string | null) => void;
  setCurrentUser: (user: CurrentUser | null) => void;
  setDomainState: (state: AuthDomainState) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  currentUser: null,
  isAuthenticated: false,
  domainState: {
    token: null,
    currentUser: null,
    status: 'ANONYMOUS',
  },
  setToken(token) {
    // 兼容过渡阶段直接写 token 的调用，后续应优先使用 setDomainState。
    set({
      token,
      isAuthenticated: Boolean(token),
    });
  },
  setCurrentUser(currentUser) {
    // 兼容过渡阶段直接写用户对象的调用，后续应优先使用 setDomainState。
    set({
      currentUser,
      isAuthenticated: Boolean(currentUser ?? useAuthStore.getState().token),
    });
  },
  setDomainState(domainState) {
    // store 只持有 SDK 输出的认证领域快照，不在前端重复定义认证规则。
    set({
      domainState,
      token: domainState.token,
      currentUser: domainState.currentUser,
      isAuthenticated: domainState.status === 'AUTHENTICATED',
    });
  },
  clearAuth() {
    // 保留清理入口，内部也同步回退到匿名认证快照。
    set({
      token: null,
      currentUser: null,
      isAuthenticated: false,
      domainState: {
        token: null,
        currentUser: null,
        status: 'ANONYMOUS',
      },
    });
  },
}));
