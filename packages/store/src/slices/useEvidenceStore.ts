import { create } from 'zustand';
import type { EvidenceDetail } from '@oil-qa-c/shared';

interface EvidenceState {
  panelOpen: boolean;
  currentMessageId: number | null;
  detail: EvidenceDetail | null;
  openPanel: (messageId: number) => void;
  closePanel: () => void;
  setDetail: (detail: EvidenceDetail | null) => void;
}

export const useEvidenceStore = create<EvidenceState>((set) => ({
  panelOpen: false,
  currentMessageId: null,
  detail: null,
  openPanel(messageId) {
    set({
      panelOpen: true,
      currentMessageId: messageId,
    });
  },
  closePanel() {
    // 关闭时同时清理选中的消息引用，避免后续页面误用旧依据数据。
    set({
      panelOpen: false,
      currentMessageId: null,
      detail: null,
    });
  },
  setDetail(detail) {
    set({ detail });
  },
}));
