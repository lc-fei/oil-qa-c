import { create } from 'zustand';

interface AppState {
  status: 'idle' | 'bootstrapping' | 'ready' | 'error';
  setStatus: (status: AppState['status']) => void;
}

export const useAppStore = create<AppState>((set) => ({
  status: 'idle',
  setStatus(status) {
    // 应用启动状态只描述全局初始化阶段，不承载具体业务加载状态。
    set({ status });
  },
}));
