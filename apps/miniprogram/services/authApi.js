const { get, post } = require('./request');

function login(payload) {
  return post('/api/auth/login', payload);
}

function getCurrentUser() {
  return get('/api/auth/me');
}

function logout() {
  return post('/api/auth/logout', {});
}

module.exports = {
  login,
  getCurrentUser,
  logout,
};
