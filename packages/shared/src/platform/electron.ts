import type { PlatformAdapter } from './types';

// Electron 当前仅保留接口位置，避免业务层把平台能力写死在 Web 实现里。
export function createElectronPlatformAdapter(): PlatformAdapter {
  throw new Error('Electron 平台适配器尚未实现');
}
