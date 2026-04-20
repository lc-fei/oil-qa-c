import type { PlatformAdapter, TokenStorage } from './types';

const TOKEN_STORAGE_KEY = 'oil-qa-c-token';

function createWebTokenStorage(): TokenStorage {
  return {
    getToken() {
      return window.localStorage.getItem(TOKEN_STORAGE_KEY);
    },
    setToken(token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    },
    clearToken() {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    },
  };
}

export function createWebPlatformAdapter(): PlatformAdapter {
  return {
    getTokenStorage() {
      return createWebTokenStorage();
    },
    openExternalLink(url) {
      // Web 端默认使用新窗口打开外链，后续 Electron 可替换为 shell 能力。
      window.open(url, '_blank', 'noopener,noreferrer');
    },
    downloadFile(url, filename = 'download') {
      // 下载逻辑统一收口到平台层，避免页面直接依赖浏览器细节。
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
    },
    async copyToClipboard(text) {
      await navigator.clipboard.writeText(text);
    },
    getRuntimeEnv() {
      const isDevelopment =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

      return {
        platform: 'web',
        // 共享包不直接依赖 Vite 注入变量，避免后续被 Electron 或其他运行时绑定死。
        mode: isDevelopment ? 'development' : 'production',
      };
    },
  };
}
