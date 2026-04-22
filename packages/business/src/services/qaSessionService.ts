import type { ChatDomainState, QaSessionDetail, QaSessionSummary, SessionDomainState } from '@oil-qa-c/shared';
import { useChatStore, useSessionStore } from '@oil-qa-c/store';
import {
  bootstrapSessionsWithSdk,
  createChatDomainState,
  createSessionWithSdk,
  deleteSessionWithSdk,
  renameSessionWithSdk,
  selectSessionWithSdk,
  syncDomainStatesFromSession,
} from '@oil-qa-c/wasm-sdk';

interface SessionBootstrapResult {
  sessions: QaSessionSummary[];
  sessionState: SessionDomainState;
  currentDetail: QaSessionDetail | null;
  chatState: ChatDomainState;
}

function applySessionResult(result: SessionBootstrapResult) {
  useSessionStore.getState().setSessions(result.sessions);
  useSessionStore.getState().setDomainState(result.sessionState);
  useSessionStore.getState().setCurrentSessionId(result.sessionState.currentSessionId ?? null);

  if (result.currentDetail) {
    useChatStore.getState().setMessages(result.currentDetail.messages);
    useChatStore.getState().setDomainState(result.chatState);
    return;
  }

  useChatStore.getState().setMessages([]);
  useChatStore.getState().setDomainState(result.chatState);
}

export const qaSessionService = {
  // 会话相关的获取、创建、切换、删除都由 SDK 统一编排，business 只负责写入 store。
  async bootstrap(options: { keyword?: string; pageNum?: number; pageSize?: number } = {}) {
    const result = await bootstrapSessionsWithSdk({
      keyword: options.keyword,
      pageNum: options.pageNum ?? 1,
      pageSize: options.pageSize ?? 20,
    });

    applySessionResult(result);
    return result;
  },
  async select(sessionId: number) {
    const result = await selectSessionWithSdk(sessionId);
    applySessionResult(result);
    return result.currentDetail;
  },
  async createAndSelect(title?: string) {
    const result = await createSessionWithSdk(title);
    applySessionResult(result);
    return result.currentDetail;
  },
  async rename(sessionId: number, title: string) {
    const result = await renameSessionWithSdk(sessionId, title);
    applySessionResult(result);
    return result.sessions;
  },
  async delete(sessionId: number) {
    const result = await deleteSessionWithSdk(sessionId);
    applySessionResult(result);
    return result;
  },
  // 页面层如需手动同步详情快照，仍通过 SDK 统一做领域状态恢复。
  buildDomainStatesFromDetail: syncDomainStatesFromSession,
  buildChatDomainState: createChatDomainState,
};
