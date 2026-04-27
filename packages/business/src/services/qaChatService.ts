import type { EvidenceDetail, SendQuestionPayload, SendQuestionResponse } from '@oil-qa-c/shared';
import { cancelQaStreamMessage, startQaStream } from '@oil-qa-c/api';
import { useChatStore, useEvidenceStore, useSessionStore } from '@oil-qa-c/store';
import {
  applyMessageChunk,
  cancelQuestionStreamWithSdk,
  createChatDomainState,
  failQuestionStreamWithSdk,
  finishQuestionStreamWithSdk,
  getEvidenceWithSdk,
  isWasmSdkReady,
  sendQuestionWithSdk,
  startQuestionStreamWithSdk,
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

interface StreamQuestionOptions {
  onAnswerChange?: (answer: string) => void;
}

let activeStreamCancel: (() => void) | null = null;

function applyChatResult(result: ChatSdkResult) {
  // SDK 返回的是完整会话快照，business 层只把快照拆分同步到对应 store。
  useSessionStore.getState().setSessions(result.sessions);
  useSessionStore.getState().setDomainState(result.sessionState);
  useSessionStore.getState().setCurrentSessionId(result.sessionState.currentSessionId ?? null);

  if (result.currentDetail) {
    // currentDetail 为空表示 SDK 判定当前无可展示消息，避免误清其他页面缓存。
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
  async sendQuestionStream(payload: SendQuestionPayload, options: StreamQuestionOptions = {}) {
    const started = await startQuestionStreamWithSdk(payload);
    applyChatResult(started.sessionResult);

    let answerBuffer = '';
    let finalResponse: SendQuestionResponse | null = null;
    let serverMessageId: number | null = null;
    let serverRequestNo: string | undefined;
    const streamPayload: SendQuestionPayload = {
      ...payload,
      sessionId: started.stream.sessionId || payload.sessionId,
    };
    const stream = startQaStream(streamPayload, {
      onStart(chunk) {
        serverMessageId = chunk.messageId;
        serverRequestNo = chunk.requestNo;
      },
      onChunk(chunk) {
        serverMessageId = chunk.messageId;
        serverRequestNo = chunk.requestNo;
        answerBuffer += chunk.delta;
        // 流式过程中的正文是客户端临时 UI 状态，完成后会被 SDK 最终快照覆盖。
        useChatStore.getState().updateStreamingMessage(started.stream.clientMessageId, answerBuffer);
        options.onAnswerChange?.(answerBuffer);
      },
      onFinal(response) {
        finalResponse = response;
        serverMessageId = response.messageId;
        serverRequestNo = response.requestNo;
      },
    });
    activeStreamCancel = () => {
      // 后端文档要求取消生成必须调用 cancel 接口；未收到 start 前只能中断本地连接。
      if (serverMessageId) {
        stream.abort();
        void cancelQaStreamMessage(serverMessageId, serverRequestNo);
        return;
      }

      stream.abort();
    };

    try {
      await stream.done;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        const result = await cancelQuestionStreamWithSdk({
          clientMessageId: started.stream.clientMessageId,
          partialAnswer: answerBuffer,
        });
        applyChatResult(result);
        return result;
      }

      if (finalResponse) {
        const result = await finishQuestionStreamWithSdk({
          clientMessageId: started.stream.clientMessageId,
          response: finalResponse,
        });
        applyChatResult(result);
        throw error;
      }

      const result = await failQuestionStreamWithSdk({
        clientMessageId: started.stream.clientMessageId,
        partialAnswer: answerBuffer,
        errorMessage: error instanceof Error ? error.message : '流式问答失败',
      });
      applyChatResult(result);
      throw error;
    } finally {
      activeStreamCancel = null;
    }

    const finalSnapshot = await finishQuestionStreamWithSdk({
      clientMessageId: started.stream.clientMessageId,
      response: finalResponse ?? {
        sessionId: started.stream.sessionId,
        sessionNo: '',
        messageId: started.stream.clientMessageId,
        messageNo: '',
        requestNo: started.stream.requestNo,
        question: payload.question,
        answer: answerBuffer,
        answerSummary: answerBuffer.slice(0, 120),
        status: 'SUCCESS',
        followUps: [],
        timings: {
          totalDurationMs: 0,
          nlpDurationMs: 0,
          graphDurationMs: 0,
          promptDurationMs: 0,
          aiDurationMs: 0,
        },
        evidenceSummary: {
          graphHit: false,
          entityCount: 0,
          relationCount: 0,
          confidence: 0,
        },
      },
    });
    applyChatResult(finalSnapshot);
    return finalSnapshot;
  },
  cancelActiveStream() {
    activeStreamCancel?.();
  },
  async getEvidence(messageId: number): Promise<EvidenceDetail> {
    const detail = await getEvidenceWithSdk(messageId);
    // 依据详情按消息维度写入缓存，页面重复展开时可直接复用。
    useEvidenceStore.getState().setDetail(detail);
    return detail;
  },
};
