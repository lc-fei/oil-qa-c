const TOKEN_KEY = 'oil_qa_token';
const USER_KEY = 'oil_qa_current_user';

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || '';
}

function setToken(token) {
  wx.setStorageSync(TOKEN_KEY, token || '');
}

function clearToken() {
  wx.removeStorageSync(TOKEN_KEY);
}

function getStoredUser() {
  return wx.getStorageSync(USER_KEY) || null;
}

function setStoredUser(user) {
  wx.setStorageSync(USER_KEY, user || null);
}

function clearStoredUser() {
  wx.removeStorageSync(USER_KEY);
}

module.exports = {
  getToken,
  setToken,
  clearToken,
  getStoredUser,
  setStoredUser,
  clearStoredUser,
};
