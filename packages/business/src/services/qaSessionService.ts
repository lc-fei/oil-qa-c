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
  // SDK 返回的是完整会话快照，business 层只负责拆分写入对应 UI store。
  useSessionStore.getState().setSessions(result.sessions);
  useSessionStore.getState().setDomainState(result.sessionState);
  useSessionStore.getState().setCurrentSessionId(result.sessionState.currentSessionId ?? null);

  if (result.currentDetail) {
    // 有当前详情时同步消息列表，否则页面应进入空会话态。
    useChatStore.getState().setMessages(result.currentDetail.messages);
    useChatStore.getState().setDomainState(result.chatState);
    return;
  }

  // 列表加载成功但详情为空时，清空旧消息，避免切换会话后残留上一轮内容。
  useChatStore.getState().setMessages([]);
  useChatStore.getState().setDomainState(result.chatState);
}

export const qaSessionService = {
  // 会话相关的获取、创建、切换、删除都由 SDK 统一编排，business 只负责写入 store。
  async bootstrap(options: { keyword?: string; pageNum?: number; pageSize?: number } = {}) {
    // pageNum/pageSize 在 service 层补默认值，页面调用时不需要重复记忆分页约定。
    const result = await bootstrapSessionsWithSdk({
      keyword: options.keyword,
      pageNum: options.pageNum ?? 1,
      pageSize: options.pageSize ?? 20,
    });

    applySessionResult(result);
    return result;
  },
  async select(sessionId: number) {
    // 切换会话必须通过 SDK 拉详情并重建领域状态，不能只改 currentSessionId。
    const result = await selectSessionWithSdk(sessionId);
    applySessionResult(result);
    return result.currentDetail;
  },
  async createAndSelect(title?: string) {
    // 新建后立即选中，保证左侧列表和中间消息区处于同一会话上下文。
    const result = await createSessionWithSdk(title);
    applySessionResult(result);
    return result.currentDetail;
  },
  async rename(sessionId: number, title: string) {
    // 重命名后 SDK 会刷新列表快照，页面只消费返回后的最新排序结果。
    const result = await renameSessionWithSdk(sessionId, title);
    applySessionResult(result);
    return result.sessions;
  },
  async delete(sessionId: number) {
    // 删除可能影响当前选中会话，后续选中项由 SDK 根据剩余列表统一决定。
    const result = await deleteSessionWithSdk(sessionId);
    applySessionResult(result);
    return result;
  },
  // 页面层如需手动同步详情快照，仍通过 SDK 统一做领域状态恢复。
  buildDomainStatesFromDetail: syncDomainStatesFromSession,
  buildChatDomainState: createChatDomainState,
};
