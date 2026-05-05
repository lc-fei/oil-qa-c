import type {
  CurrentUser,
  EvidenceDetail,
  FavoriteItemDetail,
  FavoriteItemSummary,
  LoginRequest,
  LoginResponse,
  MessageChunk,
  PaginatedResult,
  QaMessage,
  QaWorkflow,
  QaWorkflowStage,
  QaSessionSummary,
  SendQuestionPayload,
  SendQuestionResponse,
} from '@oil-qa-c/shared';
import { mockFavorites, mockMessages, mockSessions } from '../utils/mockData';
import { invokeNative, subscribeSdkEvent } from './OilQaSdk.native';
import {
  clearStoredAuth,
  getStoredCurrentUser,
  getStoredToken,
  removeStoredToken,
  setStoredCurrentUser,
  setStoredToken,
} from './mobileStorage';

interface NativeInvokeEnvelope<TData> {
  ok: boolean;
  method: string;
  data?: TData;
  code?: string;
  message?: string;
}

type MobileSdkEvent =
  | { type: 'start'; clientMessageId: number; requestNo: string; sessionId: number; question: string }
  | { type: 'stage'; clientMessageId: number; stage: QaWorkflowStage }
  | { type: 'chunk'; clientMessageId: number; chunk: MessageChunk }
  | { type: 'done'; clientMessageId: number; response: SendQuestionResponse }
  | { type: 'error'; clientMessageId: number; errorMessage: string; partialAnswer?: string };

interface StreamQuestionHandlers {
  onStart?: (event: Extract<MobileSdkEvent, { type: 'start' }>) => void;
  onStage?: (event: Extract<MobileSdkEvent, { type: 'stage' }>) => void;
  onChunk?: (event: Extract<MobileSdkEvent, { type: 'chunk' }>) => void;
  onDone?: (event: Extract<MobileSdkEvent, { type: 'done' }>) => void;
  onError?: (event: Extract<MobileSdkEvent, { type: 'error' }>) => void;
}

const localEventListeners = new Set<(event: MobileSdkEvent) => void>();

async function invoke<TData>(method: string, payload?: unknown): Promise<TData> {
  const response = await invokeNative(method, payload ?? null);
  const envelope = JSON.parse(response) as NativeInvokeEnvelope<TData>;

  if (!envelope.ok) {
    throw new Error(envelope.message ?? `${method} 调用失败`);
  }

  return envelope.data as TData;
}

function emitLocalEvent(event: MobileSdkEvent) {
  localEventListeners.forEach((listener) => listener(event));
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createStage(stageCode: string, stageName: string, status: QaWorkflowStage['status']): QaWorkflowStage {
  return {
    stageCode,
    stageName,
    status,
    durationMs: null,
    summary: null,
    errorMessage: null,
  };
}

function createWorkflow(currentStage: string, stage: QaWorkflowStage): QaWorkflow {
  return {
    traceId: `TRACE_MOBILE_${Date.now()}`,
    status: stage.status === 'FAILED' ? 'FAILED' : 'PROCESSING',
    currentStage,
    archiveId: null,
    stages: [stage],
    toolCalls: [],
  };
}

function createMockAnswer(question: string) {
  return `围绕“${question}”，移动端当前已通过 SDK 流式事件链路接收回答。真实后端接入后，答案 chunk、阶段状态和 done 事件会由 Rust SDK 统一归并。`;
}

export const mobileSdk = {
  invoke,
  subscribeSdkEvent(listener: (event: unknown) => void) {
    const unsubscribeNative = subscribeSdkEvent(listener);
    const localListener = (event: MobileSdkEvent) => listener(event);
    localEventListeners.add(localListener);

    return () => {
      unsubscribeNative();
      localEventListeners.delete(localListener);
    };
  },
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const response = await invoke<LoginResponse>('auth.login', payload);

    await setStoredToken(response.token);
    await setStoredCurrentUser({
      userId: response.userId,
      username: response.username,
      account: response.account,
      nickname: '杨博飞',
      roles: response.roles,
      status: 1,
    });

    return response;
  },
  async currentUser(): Promise<CurrentUser> {
    const token = await getStoredToken();
    if (!token) {
      throw new Error('未登录');
    }

    const currentUser = await invoke<CurrentUser>('auth.current_user');
    await setStoredCurrentUser(currentUser);
    return currentUser;
  },
  async restoreSession(): Promise<CurrentUser | null> {
    const token = await getStoredToken();
    if (!token) {
      return null;
    }

    try {
      const currentUser = await invoke<CurrentUser>('auth.restore_session', {
        token,
        currentUser: await getStoredCurrentUser(),
      });
      await setStoredCurrentUser(currentUser);
      return currentUser;
    } catch {
      await clearStoredAuth();
      return null;
    }
  },
  async logout() {
    try {
      await invoke('auth.logout');
    } finally {
      await removeStoredToken();
      await clearStoredAuth();
    }
  },
  async listSessions(): Promise<PaginatedResult<QaSessionSummary>> {
    await invoke('session.list', { pageNum: 1, pageSize: 20 });
    return { total: mockSessions.length, list: mockSessions };
  },
  async createSession(): Promise<QaSessionSummary> {
    await invoke('session.create', { title: '新对话' });
    return {
      sessionId: Date.now(),
      sessionNo: `MOBILE_${Date.now()}`,
      title: '新对话',
      lastQuestion: '',
      messageCount: 0,
      updatedAt: '刚刚',
      isFavorite: false,
    };
  },
  async renameSession(sessionId: number, title: string) {
    await invoke('session.rename', { sessionId, title });
  },
  async deleteSession(sessionId: number) {
    await invoke('session.delete', { sessionId });
  },
  async detailSession(sessionId: number): Promise<{ sessionId: number; messages: QaMessage[] }> {
    await invoke('session.detail', { sessionId });
    return { sessionId, messages: mockMessages };
  },
  async sendQuestion(payload: SendQuestionPayload): Promise<SendQuestionResponse> {
    await invoke('chat.send', payload);
    return {
      sessionId: payload.sessionId ?? 1,
      sessionNo: 'SES_MOBILE_001',
      messageId: Date.now(),
      messageNo: `MSG_${Date.now()}`,
      requestNo: `REQ_${Date.now()}`,
      question: payload.question,
      answer: '这是来自 Rust mobile binding 链路的移动端回答占位，后续接入真实流式事件后会由 SDK 推送 chunk。',
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
    };
  },
  async streamQuestion(payload: SendQuestionPayload, handlers: StreamQuestionHandlers = {}) {
    const clientMessageId = Date.now();
    const sessionId = payload.sessionId ?? 1;
    const requestNo = `REQ_MOBILE_${clientMessageId}`;
    const messageNo = `MSG_MOBILE_${clientMessageId}`;

    try {
      await invoke('chat.stream.start', payload);

      const startEvent: Extract<MobileSdkEvent, { type: 'start' }> = {
        type: 'start',
        clientMessageId,
        requestNo,
        sessionId,
        question: payload.question,
      };
      emitLocalEvent(startEvent);
      handlers.onStart?.(startEvent);

      const stages = [
        ['QUESTION_UNDERSTANDING', '问题理解'],
        ['PLANNING', '任务规划'],
        ['RETRIEVAL', '知识检索'],
        ['EVIDENCE_RANKING', '证据排序'],
        ['GENERATION', '答案生成'],
        ['ARCHIVING', '结果归档'],
      ] as const;

      let answer = '';
      let sequence = 0;
      const chunks = createMockAnswer(payload.question).match(/.{1,14}/g) ?? [];

      for (const [stageCode, stageName] of stages) {
        const stage = createStage(stageCode, stageName, 'PROCESSING');
        const stageEvent: Extract<MobileSdkEvent, { type: 'stage' }> = { type: 'stage', clientMessageId, stage };
        emitLocalEvent(stageEvent);
        handlers.onStage?.(stageEvent);
        await delay(180);

        if (stageCode === 'GENERATION') {
          for (const delta of chunks) {
            sequence += 1;
            answer += delta;
            const chunk: MessageChunk = {
              messageId: clientMessageId,
              messageNo,
              sessionId,
              sessionNo: 'SES_MOBILE_STREAM',
              requestNo,
              delta,
              done: false,
              sequence,
              errorMessage: null,
              stage,
              toolCall: null,
              workflow: createWorkflow(stageName, stage),
            };
            const chunkEvent: Extract<MobileSdkEvent, { type: 'chunk' }> = { type: 'chunk', clientMessageId, chunk };
            emitLocalEvent(chunkEvent);
            handlers.onChunk?.(chunkEvent);
            await delay(60);
          }
        }

        const successStage = createStage(stageCode, stageName, 'SUCCESS');
        const successEvent: Extract<MobileSdkEvent, { type: 'stage' }> = {
          type: 'stage',
          clientMessageId,
          stage: successStage,
        };
        emitLocalEvent(successEvent);
        handlers.onStage?.(successEvent);
      }

      const response: SendQuestionResponse = {
        sessionId,
        sessionNo: 'SES_MOBILE_STREAM',
        messageId: clientMessageId,
        messageNo,
        requestNo,
        question: payload.question,
        answer,
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
        workflow: {
          traceId: `TRACE_MOBILE_${clientMessageId}`,
          status: 'SUCCESS',
          currentStage: '结果归档',
          archiveId: null,
          stages: stages.map(([stageCode, stageName]) => createStage(stageCode, stageName, 'SUCCESS')),
          toolCalls: [],
        },
      };

      await invoke('chat.stream.finish', { clientMessageId, response });
      const doneEvent: Extract<MobileSdkEvent, { type: 'done' }> = { type: 'done', clientMessageId, response };
      emitLocalEvent(doneEvent);
      handlers.onDone?.(doneEvent);
      return response;
    } catch (error) {
      const errorEvent: Extract<MobileSdkEvent, { type: 'error' }> = {
        type: 'error',
        clientMessageId,
        errorMessage: error instanceof Error ? error.message : '流式问答失败',
      };
      emitLocalEvent(errorEvent);
      handlers.onError?.(errorEvent);
      throw error;
    }
  },
  async evidence(messageId: number): Promise<EvidenceDetail> {
    await invoke('chat.evidence', { messageId });
    return {
      messageId,
      requestNo: 'REQ_MOBILE_001',
      entities: [{ entityId: 'ENT_1', entityName: '钻井液', entityType: '材料介质' }],
      relations: [{ sourceName: '钻井液', relationType: '影响', targetName: '井壁稳定' }],
      graphData: { center: null, nodes: [], edges: [] },
      sources: [{ sourceType: 'GRAPH_SUMMARY', title: '图谱摘要', content: '钻井液性能会影响井壁稳定。' }],
      timings: {
        totalDurationMs: 0,
        nlpDurationMs: 0,
        graphDurationMs: 0,
        promptDurationMs: 0,
        aiDurationMs: 0,
      },
      confidence: 0.82,
    };
  },
  async listFavorites(): Promise<PaginatedResult<FavoriteItemSummary>> {
    await invoke('favorite.list', { pageNum: 1, pageSize: 20 });
    return { total: mockFavorites.length, list: mockFavorites };
  },
  async favoriteMessage(messageId: number) {
    await invoke('favorite.add', { messageId });
  },
  async removeFavorite(favoriteId: number) {
    await invoke('favorite.remove', { favoriteId });
  },
  async favoriteDetail(favoriteId: number): Promise<FavoriteItemDetail> {
    await invoke('favorite.detail', { favoriteId });
    const item = mockFavorites.find((favorite) => favorite.favoriteId === favoriteId) ?? mockFavorites[0];

    return {
      ...item,
      question: '井壁失稳通常由哪些因素引起？',
      answer: '井壁失稳通常与地层力学、钻井液性能、井眼轨迹和施工扰动有关。',
    };
  },
};
