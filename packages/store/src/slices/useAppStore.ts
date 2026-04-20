import { create } from 'zustand';

interface AppState {
  status: 'idle' | 'bootstrapping' | 'ready' | 'error';
  setStatus: (status: AppState['status']) => void;
}

export const useAppStore = create<AppState>((set) => ({
  status: 'idle',
  setStatus(status) {
    set({ status });
  },
}));
