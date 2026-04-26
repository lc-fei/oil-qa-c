import { create } from 'zustand';
import type { ChatDomainState, QaMessage } from '@oil-qa-c/shared';

interface ChatState {
  messages: QaMessage[];
  isSending: boolean;
  domainState: ChatDomainState;
  setMessages: (messages: QaMessage[]) => void;
  appendMessage: (message: QaMessage) => void;
  updateMessageFavorite: (messageId: number, favorite: boolean) => void;
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
  updateMessageFavorite(messageId, favorite) {
    // 收藏状态会从聊天页和收藏页同时改变，这里按 messageId 做局部更新。
    set((state) => ({
      messages: state.messages.map((message) =>
        message.messageId === messageId
          ? {
              ...message,
              favorite,
            }
          : message,
      ),
    }));
  },
  setSending(isSending) {
    // 发送中状态属于 UI 交互锁，防止用户重复提交同一个问题。
    set({ isSending });
  },
  setDomainState(domainState) {
    // UI store 只负责持有领域状态快照，具体推进规则由 SDK 决定。
    set({ domainState });
  },
}));
