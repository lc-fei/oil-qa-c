import { create } from 'zustand';
import type { ChatDomainState, QaMessage } from '@oil-qa-c/shared';

interface ChatState {
  messages: QaMessage[];
  isSending: boolean;
  domainState: ChatDomainState;
  setMessages: (messages: QaMessage[]) => void;
  appendMessage: (message: QaMessage) => void;
  setSending: (value: boolean) => void;
  setDomainState: (state: ChatDomainState) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isSending: false,
  domainState: {
    activeMessageId: null,
    status: 'IDLE',
    messageIds: [],
    streamBuffer: {},
  },
  setMessages(messages) {
    set({ messages });
  },
  appendMessage(message) {
    // 消息流按时间追加，后续流式输出时可在这里扩展增量更新逻辑。
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },
  setSending(isSending) {
    set({ isSending });
  },
  setDomainState(domainState) {
    // UI store 只负责持有领域状态快照，具体推进规则由 SDK 决定。
    set({ domainState });
  },
}));
