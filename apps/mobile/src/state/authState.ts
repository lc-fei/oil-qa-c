import type { CurrentUser } from '@oil-qa-c/shared';
import { mobileSdk } from '../sdk';
import { createStore } from './createStore';

interface AuthState {
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  currentUser: CurrentUser | null;
  errorMessage: string;
  bootstrap: () => Promise<void>;
  login: (account: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const authStore = createStore<AuthState>({
  isAuthenticated: false,
  isBootstrapping: true,
  currentUser: null,
  errorMessage: '',
  async bootstrap() {
    authStore.setState({ isBootstrapping: true });
    try {
      const currentUser = await mobileSdk.restoreSession();
      authStore.setState({ currentUser, isAuthenticated: Boolean(currentUser), errorMessage: '' });
    } catch {
      authStore.setState({ currentUser: null, isAuthenticated: false });
    } finally {
      authStore.setState({ isBootstrapping: false });
    }
  },
  async login(account, password) {
    authStore.setState({ errorMessage: '' });
    try {
      await mobileSdk.login({ account, password });
      const currentUser = await mobileSdk.currentUser();
      authStore.setState({ currentUser, isAuthenticated: true });
    } catch (error) {
      authStore.setState({ errorMessage: error instanceof Error ? error.message : '登录失败' });
      throw error;
    }
  },
  async logout() {
    await mobileSdk.logout();
    authStore.setState({ currentUser: null, isAuthenticated: false });
  },
});

export function useAuthStore<TSelected>(selector: (state: AuthState) => TSelected) {
  return authStore.useStore(selector);
}
