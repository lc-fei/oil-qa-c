import type { EvidenceDetail, MessageChunk, QaToolCall, QaWorkflow, QaWorkflowStage, SendQuestionPayload, SendQuestionResponse } from '@oil-qa-c/shared';
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

function isIgnoredWorkflowStage(stageCode: string) {
  return stageCode === 'QUALITY_CHECK';
}

function upsertWorkflowStage(stages: QaWorkflowStage[], nextStage: QaWorkflowStage) {
  if (isIgnoredWorkflowStage(nextStage.stageCode)) {
    return stages.filter((stage) => !isIgnoredWorkflowStage(stage.stageCode));
  }

  const stageIndex = stages.findIndex((stage) => stage.stageCode === nextStage.stageCode);

  if (stageIndex < 0) {
    return [...stages, nextStage];
  }

  return stages.map((stage, index) => (index === stageIndex ? { ...stage, ...nextStage } : stage));
}

function upsertWorkflowToolCall(toolCalls: QaToolCall[], nextToolCall: QaToolCall) {
  const toolIndex = toolCalls.findIndex((toolCall) => toolCall.toolName === nextToolCall.toolName);

  if (toolIndex < 0) {
    return [...toolCalls, nextToolCall];
  }

  return toolCalls.map((toolCall, index) => (index === toolIndex ? { ...toolCall, ...nextToolCall } : toolCall));
}

function buildWorkflowFromChunk(chunk: MessageChunk): QaWorkflow | null {
  const workflow: QaWorkflow | null = chunk.workflow
    ? {
        ...chunk.workflow,
        stages: [...chunk.workflow.stages],
        toolCalls: [...chunk.workflow.toolCalls],
      }
    : chunk.stage
      && !isIgnoredWorkflowStage(chunk.stage.stageCode)
      ? {
          traceId: chunk.requestNo,
          status: chunk.stage.status === 'FAILED' ? 'FAILED' : 'PROCESSING',
          currentStage: chunk.stage.stageCode,
          archiveId: null,
          stages: [],
          toolCalls: [],
        }
      : null;

  if (!workflow) {
    return null;
  }

  if (chunk.stage && !isIgnoredWorkflowStage(chunk.stage.stageCode)) {
    // 后端 stage 事件可能只在顶层 stage 字段给出阶段状态，SDK 侧统一合并成 workflow 快照。
    workflow.currentStage = chunk.stage.stageCode;
    workflow.stages = upsertWorkflowStage(workflow.stages, chunk.stage);
  } else {
    workflow.stages = workflow.stages.filter((stage) => !isIgnoredWorkflowStage(stage.stageCode));
  }

  if (chunk.toolCall) {
    // 工具调用同样按名称归并，避免同一个工具 PROCESSING/SUCCESS 事件重复铺满 UI。
    workflow.toolCalls = upsertWorkflowToolCall(workflow.toolCalls, chunk.toolCall);
  }

  return workflow;
}

function updateWorkflowFromChunk(clientMessageId: number, chunk: MessageChunk) {
  const workflow = buildWorkflowFromChunk(chunk);

  if (workflow) {
    useChatStore.getState().updateMessageWorkflow(clientMessageId, workflow);
  }
}

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
        updateWorkflowFromChunk(started.stream.clientMessageId, chunk);
      },
      onWorkflow(chunk) {
        // workflow 事件只更新执行过程展示，不改变回答正文和 SDK checkpoint。
        updateWorkflowFromChunk(started.stream.clientMessageId, chunk);
      },
      onChunk(chunk) {
        serverMessageId = chunk.messageId;
        serverRequestNo = chunk.requestNo;
        answerBuffer += chunk.delta;
        // 流式过程中的正文是客户端临时 UI 状态，完成后会被 SDK 最终快照覆盖。
        useChatStore.getState().updateStreamingMessage(started.stream.clientMessageId, answerBuffer);
        updateWorkflowFromChunk(started.stream.clientMessageId, chunk);
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
