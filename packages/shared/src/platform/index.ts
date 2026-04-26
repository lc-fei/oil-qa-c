import { createWebPlatformAdapter } from './web';
export type { PlatformAdapter, TokenStorage } from './types';
import type { PlatformAdapter } from './types';

// 当前阶段默认注入 Web 适配器；Electron 复用时只替换这里的适配器创建逻辑。
const adapter = createWebPlatformAdapter();

export function getTokenStorage() {
  // token 存储通过平台层暴露，SDK 与业务层不直接感知 localStorage。
  return adapter.getTokenStorage();
}

export function openExternalLink(url: string) {
  adapter.openExternalLink(url);
}

export function downloadFile(url: string, filename?: string) {
  adapter.downloadFile(url, filename);
}

export function copyToClipboard(text: string) {
  return adapter.copyToClipboard(text);
}

export function getRuntimeEnv() {
  return adapter.getRuntimeEnv();
}
