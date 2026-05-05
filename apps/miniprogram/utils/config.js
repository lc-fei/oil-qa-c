const DEFAULT_BASE_URL = 'http://localhost:8080';

const runtimeConfig = {
  baseURL: DEFAULT_BASE_URL,
};

function configureRuntime(options = {}) {
  runtimeConfig.baseURL = normalizeBaseURL(options.baseURL || wx.getStorageSync('oil_qa_base_url') || DEFAULT_BASE_URL);
}

function setBaseURL(baseURL) {
  runtimeConfig.baseURL = normalizeBaseURL(baseURL || DEFAULT_BASE_URL);
  wx.setStorageSync('oil_qa_base_url', runtimeConfig.baseURL);
}

function getBaseURL() {
  return runtimeConfig.baseURL;
}

function buildUrl(path) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  const baseURL = normalizeBaseURL(runtimeConfig.baseURL);
  if (!baseURL) {
    throw new Error('小程序 API baseURL 未配置，wx.request 不支持相对路径');
  }

  return `${baseURL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

function normalizeBaseURL(baseURL) {
  const normalized = String(baseURL || '').trim();
  if (!normalized) return '';
  if (!/^https?:\/\//.test(normalized)) {
    throw new Error(`小程序 API baseURL 必须是 http/https 绝对地址，当前值: ${normalized}`);
  }
  return normalized;
}

module.exports = {
  DEFAULT_BASE_URL,
  configureRuntime,
  setBaseURL,
  getBaseURL,
  buildUrl,
};
