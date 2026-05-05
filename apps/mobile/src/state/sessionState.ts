import type { QaMessage, QaSessionSummary } from '@oil-qa-c/shared';
import { mobileSdk } from '../sdk';
import { createStore } from './createStore';

interface SessionState {
  sessions: QaSessionSummary[];
  currentSessionId: number | null;
  messages: QaMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  loadSessions: () => Promise<void>;
  createSession: () => Promise<QaSessionSummary>;
  openSession: (sessionId: number) => Promise<void>;
  renameSession: (sessionId: number, title: string) => Promise<void>;
  deleteSession: (sessionId: number) => Promise<void>;
  sendQuestion: (question: string, sessionId?: number | null) => Promise<void>;
  appendMessage: (message: QaMessage) => void;
  updateMessageFavorite: (messageId: number, favorite: boolean) => void;
}

const sessionStore = createStore<SessionState>({
  sessions: [],
  currentSessionId: null,
  messages: [],
  isLoading: false,
  isStreaming: false,
  async loadSessions() {
    sessionStore.setState({ isLoading: true });
    try {
      const result = await mobileSdk.listSessions();
      sessionStore.setState({ sessions: result.list });
    } finally {
      sessionStore.setState({ isLoading: false });
    }
  },
  async createSession() {
    const session = await mobileSdk.createSession();
    sessionStore.setState((state) => ({
      ...state,
      sessions: [session, ...state.sessions],
      currentSessionId: session.sessionId,
      messages: [],
    }));
    return session;
  },
  async openSession(sessionId) {
    const detail = await mobileSdk.detailSession(sessionId);
    sessionStore.setState({ currentSessionId: sessionId, messages: detail.messages });
  },
  async renameSession(sessionId, title) {
    await mobileSdk.renameSession(sessionId, title);
    sessionStore.setState((state) => ({
      ...state,
      sessions: state.sessions.map((session) => (session.sessionId === sessionId ? { ...session, title } : session)),
    }));
  },
  async deleteSession(sessionId) {
    await mobileSdk.deleteSession(sessionId);
    sessionStore.setState((state) => ({
      ...state,
      sessions: state.sessions.filter((session) => session.sessionId !== sessionId),
      currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId,
      messages: state.currentSessionId === sessionId ? [] : state.messages,
    }));
  },
  async sendQuestion(question, sessionId) {
    const activeSessionId = sessionId ?? sessionStore.getState().currentSessionId ?? 1;
    sessionStore.setState({ isStreaming: true });

    await mobileSdk.streamQuestion(
      { sessionId: activeSessionId, question },
      {
        onStart(event) {
          const processingMessage: QaMessage = {
            messageId: event.clientMessageId,
            messageNo: `MSG_MOBILE_${event.clientMessageId}`,
            requestNo: event.requestNo,
            question: event.question,
            answer: '',
            status: 'PROCESSING',
            partialAnswer: '',
            streamSequence: 0,
            interruptedReason: null,
            createdAt: '刚刚',
            finishedAt: undefined,
            favorite: false,
            feedbackType: null,
            workflow: {
              traceId: `TRACE_MOBILE_${event.clientMessageId}`,
              status: 'PROCESSING',
              currentStage: '问题理解',
              archiveId: null,
              stages: [],
              toolCalls: [],
            },
          };
          sessionStore.getState().appendMessage(processingMessage);
        },
        onStage(event) {
          sessionStore.setState((state) => ({
            ...state,
            messages: state.messages.map((message) =>
              message.messageId === event.clientMessageId
                ? {
                    ...message,
                    workflow: {
                      traceId: message.workflow?.traceId ?? `TRACE_MOBILE_${event.clientMessageId}`,
                      status: event.stage.status === 'FAILED' ? 'FAILED' : 'PROCESSING',
                      currentStage: event.stage.stageName,
                      archiveId: null,
                      stages: [...(message.workflow?.stages ?? []), event.stage],
                      toolCalls: message.workflow?.toolCalls ?? [],
                    },
                  }
                : message,
            ),
          }));
        },
        onChunk(event) {
          sessionStore.setState((state) => ({
            ...state,
            messages: state.messages.map((message) =>
              message.messageId === event.clientMessageId
                ? {
                    ...message,
                    answer: `${message.answer}${event.chunk.delta}`,
                    partialAnswer: `${message.partialAnswer ?? message.answer}${event.chunk.delta}`,
                    streamSequence: event.chunk.sequence,
                    workflow: event.chunk.workflow ?? message.workflow,
                  }
                : message,
            ),
          }));
        },
        onDone(event) {
          sessionStore.setState((state) => ({
            ...state,
            isStreaming: false,
            currentSessionId: event.response.sessionId,
            messages: state.messages.map((message) =>
              message.messageId === event.clientMessageId
                ? {
                    ...message,
                    answer: event.response.answer,
                    partialAnswer: null,
                    status: event.response.status,
                    finishedAt: '刚刚',
                    workflow: event.response.workflow ?? message.workflow,
                  }
                : message,
            ),
          }));
        },
        onError(event) {
          sessionStore.setState((state) => ({
            ...state,
            isStreaming: false,
            messages: state.messages.map((message) =>
              message.messageId === event.clientMessageId
                ? {
                    ...message,
                    status: 'FAILED',
                    partialAnswer: event.partialAnswer ?? message.partialAnswer,
                    interruptedReason: event.errorMessage,
                  }
                : message,
            ),
          }));
        },
      },
    );
  },
  appendMessage(message) {
    sessionStore.setState((state) => ({
      ...state,
      messages: [...state.messages, message],
    }));
  },
  updateMessageFavorite(messageId, favorite) {
    sessionStore.setState((state) => ({
      ...state,
      messages: state.messages.map((message) => (message.messageId === messageId ? { ...message, favorite } : message)),
    }));
  },
});

export function useSessionStore<TSelected>(selector: (state: SessionState) => TSelected) {
  return sessionStore.useStore(selector);
}
