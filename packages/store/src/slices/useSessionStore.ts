import { create } from 'zustand';
import type { QaSessionSummary, SessionDomainState } from '@oil-qa-c/shared';

interface SessionState {
  sessions: QaSessionSummary[];
  currentSessionId: number | null;
  domainState: SessionDomainState;
  setSessions: (sessions: QaSessionSummary[]) => void;
  setCurrentSessionId: (sessionId: number | null) => void;
  setDomainState: (state: SessionDomainState) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessions: [],
  currentSessionId: null,
  domainState: {
    currentSessionId: null,
    orderedSessionIds: [],
    emptySession: true,
  },
  setSessions(sessions) {
    set({ sessions });
  },
  setCurrentSessionId(currentSessionId) {
    set({ currentSessionId });
  },
  setDomainState(domainState) {
    // store 只保存 SDK 生成的领域快照，不在这里重新实现会话规则。
    set({ domainState });
  },
}));
