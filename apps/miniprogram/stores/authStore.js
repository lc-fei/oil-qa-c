const { loginWithSdk, restoreAuthSessionWithSdk, logoutWithSdk } = require('../sdk/miniprogramSdk');
const {
  getToken,
  setToken,
  clearToken,
  getStoredUser,
  setStoredUser,
  clearStoredUser,
} = require('../utils/tokenStorage');

const state = {
  token: '',
  currentUser: null,
};

const listeners = [];

function notify() {
  listeners.forEach((listener) => listener({ ...state }));
}

const authStore = {
  subscribe(listener) {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index >= 0) listeners.splice(index, 1);
    };
  },
  restore() {
    state.token = getToken();
    state.currentUser = getStoredUser();
    notify();
  },
  getToken() {
    return state.token;
  },
  getState() {
    return { ...state };
  },
  setSession(token, user) {
    state.token = token || '';
    state.currentUser = user || null;
    setToken(state.token);
    setStoredUser(state.currentUser);
    notify();
  },
  async login(payload) {
    const response = await loginWithSdk(payload.account, payload.password);
    state.token = response.token;
    setToken(state.token);
    state.currentUser = response.currentUser;
    setStoredUser(response.currentUser);
    notify();
    return response.currentUser;
  },
  async loadCurrentUser() {
    const response = await restoreAuthSessionWithSdk();
    state.token = response.token || '';
    state.currentUser = response.currentUser;
    setToken(state.token);
    setStoredUser(response.currentUser);
    notify();
    return response.currentUser;
  },
  async logout() {
    await logoutWithSdk();
    this.clear();
  },
  clear() {
    state.token = '';
    state.currentUser = null;
    clearToken();
    clearStoredUser();
    notify();
  },
};

module.exports = {
  authStore,
};
