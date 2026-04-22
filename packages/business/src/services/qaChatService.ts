import type { EvidenceDetail, SendQuestionPayload } from '@oil-qa-c/shared';
import { useChatStore, useEvidenceStore, useSessionStore } from '@oil-qa-c/store';
import {
  applyMessageChunk,
  createChatDomainState,
  getEvidenceWithSdk,
  isWasmSdkReady,
  sendQuestionWithSdk,
} from '@oil-qa-c/wasm-sdk';

interface ChatSdkResult {
  sessions: ReturnType<typeof useSessionStore.getState>['sessions'];
  sessionState: ReturnType<typeof useSessionStore.getState>['domainState'];
  currentDetail: {
    sessionId: number;
    messages: ReturnType<typeof useChatStore.getState>['messages'];
  } | null;
  chatState: ReturnType<typeof useChatStore.getState>['domainState'];
}

function applyChatResult(result: ChatSdkResult) {
  useSessionStore.getState().setSessions(result.sessions);
  useSessionStore.getState().setDomainState(result.sessionState);
  useSessionStore.getState().setCurrentSessionId(result.sessionState.currentSessionId ?? null);

  if (result.currentDetail) {
    useChatStore.getState().setMessages(result.currentDetail.messages);
  }
  useChatStore.getState().setDomainState(result.chatState);
}

export const qaChatService = {
  // 聊天域的网络调用和领域状态推进统一交给 SDK，business 只做 store 映射。
  isSdkReady: isWasmSdkReady,
  buildChatDomainState: createChatDomainState,
  applyMessageChunk,
  async sendQuestion(payload: SendQuestionPayload) {
    const result = await sendQuestionWithSdk(payload);
    applyChatResult(result);
    return result;
  },
  async getEvidence(messageId: number): Promise<EvidenceDetail> {
    const detail = await getEvidenceWithSdk(messageId);
    useEvidenceStore.getState().setDetail(detail);
    return detail;
  },
};
