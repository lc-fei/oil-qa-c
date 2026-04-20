import type { RuntimeEnv } from '../types';

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
