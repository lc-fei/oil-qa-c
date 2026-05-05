import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CurrentUser } from '@oil-qa-c/shared';

const AUTH_TOKEN_KEY = 'oil_qa_mobile.auth_token';
const CURRENT_USER_KEY = 'oil_qa_mobile.current_user';

export async function getStoredToken() {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

export async function setStoredToken(token: string) {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
}

export async function removeStoredToken() {
  await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
}

export async function getStoredCurrentUser() {
  const rawUser = await AsyncStorage.getItem(CURRENT_USER_KEY);
  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as CurrentUser;
  } catch {
    // 持久化结构异常时直接清理，避免启动恢复进入不可用登录态。
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
    return null;
  }
}

export async function setStoredCurrentUser(currentUser: CurrentUser) {
  await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
}

export async function clearStoredAuth() {
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, CURRENT_USER_KEY]);
}
