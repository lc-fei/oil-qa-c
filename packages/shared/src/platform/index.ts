import { createWebPlatformAdapter } from './web';
export type { PlatformAdapter, TokenStorage } from './types';
import type { PlatformAdapter } from './types';

const adapter = createWebPlatformAdapter();

export function getTokenStorage() {
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
