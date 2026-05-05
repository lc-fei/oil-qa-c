const { buildUrl } = require('../utils/config');
const { getToken, clearToken, clearStoredUser } = require('../utils/tokenStorage');

function parseEnvelope(payload) {
  if (payload && typeof payload === 'object' && ('code' in payload || 'data' in payload || 'message' in payload)) {
    const code = payload.code;
    if (code !== undefined && code !== 0 && code !== 200) {
      throw new Error(payload.message || '请求失败');
    }
    return payload.data;
  }
  return payload;
}

function handleUnauthorized(statusCode) {
  if (statusCode === 401 || statusCode === 403) {
    clearToken();
    clearStoredUser();
    wx.reLaunch({ url: '/pages/login/login' });
  }
}

function request({ url, method = 'GET', data, header = {}, raw = false }) {
  const token = getToken();

  return new Promise((resolve, reject) => {
    wx.request({
      url: buildUrl(url),
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...header,
      },
      success(response) {
        handleUnauthorized(response.statusCode);

        if (response.statusCode < 200 || response.statusCode >= 300) {
          const message = response.data && response.data.message ? response.data.message : `请求失败：${response.statusCode}`;
          reject(new Error(message));
          return;
        }

        try {
          resolve(raw ? response.data : parseEnvelope(response.data));
        } catch (error) {
          reject(error);
        }
      },
      fail(error) {
        reject(new Error(error.errMsg || '网络请求失败'));
      },
    });
  });
}

module.exports = {
  request,
  get: (url, options = {}) => request({ url, method: 'GET', ...options }),
  post: (url, data, options = {}) => request({ url, method: 'POST', data, ...options }),
  put: (url, data, options = {}) => request({ url, method: 'PUT', data, ...options }),
  del: (url, options = {}) => request({ url, method: 'DELETE', ...options }),
};
