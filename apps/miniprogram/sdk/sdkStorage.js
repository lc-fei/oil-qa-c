const {
  getToken,
  setToken,
  clearToken,
  getStoredUser,
  setStoredUser,
  clearStoredUser,
} = require('../utils/tokenStorage');

function invokeSdkStorage(request) {
  const { action, key, value } = request;

  if (key === 'authToken') {
    if (action === 'get') return Promise.resolve(getToken());
    if (action === 'set') {
      setToken(value || '');
      return Promise.resolve(null);
    }
    clearToken();
    return Promise.resolve(null);
  }

  if (key === 'currentUser') {
    if (action === 'get') return Promise.resolve(getStoredUser());
    if (action === 'set') {
      setStoredUser(value || null);
      return Promise.resolve(null);
    }
    clearStoredUser();
    return Promise.resolve(null);
  }

  throw new Error(`未支持的 SDK storage key: ${key}`);
}

module.exports = {
  invokeSdkStorage,
};
