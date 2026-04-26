import type { RuntimeEnv } from '../types';

// 平台接口只描述能力，不绑定 Web/Electron 的具体实现，供 SDK 初始化和业务层复用。
export interface TokenStorage {
  getToken(): string | null;
  setToken(token: string): void;
  clearToken(): void;
}

export interface PlatformAdapter {
  getTokenStorage(): TokenStorage;
  openExternalLink(url: string): void;
  downloadFile(url: string, filename?: string): void;
  copyToClipboard(text: string): Promise<void>;
  getRuntimeEnv(): RuntimeEnv;
}
