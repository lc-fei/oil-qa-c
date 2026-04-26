import type {
  AuthDomainState,
  ChatDomainState,
  CurrentUser,
  EvidenceDetail,
  FavoriteItemDetail,
  FavoriteItemSummary,
  FeedbackType,
  MessageChunk,
  AdminPaginatedResult,
  BatchExceptionHandleStatusPayload,
  BatchHandleStatusResult,
  ExceptionHandleStatusPayload,
  ExceptionLogDetail,
  ExceptionLogQuery,
  ExceptionLogSummary,
  ExceptionLogSummaryStatistics,
  MonitorAiCallDetail,
  MonitorGraphRetrievalDetail,
  MonitorNlpDetail,
  MonitorOverview,
  MonitorOverviewQuery,
  MonitorPerformanceQuery,
  MonitorPerformanceStatistics,
  MonitorPromptDetail,
  MonitorPromptDetailQuery,
  MonitorRequestDetail,
  MonitorRequestQuery,
  MonitorRequestSummary,
  MonitorTimingDetail,
  MonitorTopQuestionItem,
  MonitorTopQuestionQuery,
  MonitorTrendItem,
  MonitorTrendQuery,
  PaginatedResult,
  QaMessage,
  QaSessionDetail,
  QaSessionSummary,
  SendQuestionPayload,
  RecommendationItem,
  RuntimeEnv,
  SessionDomainState,
} from '@oil-qa-c/shared';
import { getTokenStorage } from '@oil-qa-c/shared';
import { createWebSdkTransport } from '@oil-qa-c/api';
import type { GeneratedWasmModule } from './generated';

interface InitWasmSdkOptions {
  runtime: RuntimeEnv;
  source: string;
}

let wasmSdkReady = false;
let generatedModule: GeneratedWasmModule | null = null;

interface StorageInvokeRequest {
  action: 'get' | 'set' | 'remove';
  key: string;
  value?: string | null;
}

export interface SessionSdkResult {
  sessions: QaSessionSummary[];
  sessionState: SessionDomainState;
  currentDetail: QaSessionDetail | null;
  chatState: ChatDomainState;
}

function createWebStorageBridge() {
  const tokenStorage = getTokenStorage();

  return async function invokeStorage(rawRequest: unknown) {
    const request = rawRequest as StorageInvokeRequest;

    // 当前只先注册 token 存储，后续再扩展为更通用的 key-value 平台存储。
    if (request.key !== 'authToken') {
      throw new Error(`未支持的 storage key: ${request.key}`);
    }

    if (request.action === 'get') {
      // 登录恢复由 SDK 主导，storage bridge 只负责提供当前平台的持久化 token。
      return tokenStorage.getToken();
    }

    if (request.action === 'set') {
      // SDK 登录成功后写入 token，Web 端负责落到浏览器存储。
      tokenStorage.setToken(request.value ?? '');
      return null;
    }

    // remove 用于退出登录或认证过期，清理后路由守卫会回到登录页。
    tokenStorage.clearToken();
    return null;
  };
}

async function loadGeneratedModule() {
  // wasm 模块只加载一次，避免重复初始化导致 transport/storage 注册被覆盖。
  if (generatedModule) {
    return generatedModule;
  }

  try {
    // wasm-pack 会在 pkg 目录下生成 JS glue 与 .wasm 文件，这里按固定输出名加载。
    const modulePath = '../pkg/oil_qa_wasm.js';
    const module = (await import(/* @vite-ignore */ modulePath)) as GeneratedWasmModule;
    generatedModule = module;
    return module;
  } catch (error) {
    throw new Error(
      `真实 wasm 产物加载失败，请先执行 pnpm build:wasm。原始错误: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function initWasmSdk(options: InitWasmSdkOptions) {
  const module = await loadGeneratedModule();
  const transportBridge = createWebSdkTransport();
  await module.default();
  // Web 端启动时注册平台能力，后续所有业务调用都从 sdk_invoke 进入 Rust SDK。
  module.register_transport(async (rawRequest) => transportBridge(rawRequest as never));
  module.register_storage(createWebStorageBridge());
  const status = await module.sdk_invoke('system.status', {});
  console.info('init wasm sdk success', {
    ...options,
    mode: 'wasm',
    status,
  });

  wasmSdkReady = true;
}

export function isWasmSdkReady() {
  return wasmSdkReady;
}

async function getWasmModule() {
  // 业务调用必须发生在 initWasmSdk 之后，否则无法保证 transport/storage 已注册。
  if (!generatedModule) {
    throw new Error('WASM SDK 尚未初始化，请先完成 initWasmSdk');
  }

  return generatedModule;
}

// 对外统一提供 invoke 入口，业务层按方法名调用 SDK，避免直接依赖 wasm 的具体导出细节。
export async function invokeSdk<TResponse>(method: string, payload: unknown): Promise<TResponse> {
  const module = await getWasmModule();
  return (await module.sdk_invoke(method, payload)) as TResponse;
}

export async function generateSessionTitle(question: string) {
  const result = await invokeSdk<{ title: string }>('session.generate_title', { question });
  return result.title;
}

export async function createAuthenticatedState(token: string, currentUser: CurrentUser) {
  return invokeSdk<AuthDomainState>('auth.create_authenticated_state', {
    token,
    currentUser,
  });
}

export async function createAnonymousAuthState() {
  return invokeSdk<AuthDomainState>('auth.create_anonymous_state', {});
}

export async function createExpiredAuthState() {
  return invokeSdk<AuthDomainState>('auth.create_expired_state', {});
}

export async function loginWithSdk(account: string, password: string) {
  return invokeSdk<AuthDomainState>('auth.login', {
    account,
    password,
  });
}

export async function restoreAuthSessionWithSdk() {
  return invokeSdk<AuthDomainState>('auth.restore_session', {});
}

export async function logoutWithSdk() {
  return invokeSdk<AuthDomainState>('auth.logout', {});
}

export async function getAuthStateSnapshot() {
  return invokeSdk<AuthDomainState>('auth.state.get', {});
}

export async function createSessionDomainState(sessions: QaSessionSummary[], currentSessionId: number | null) {
  return invokeSdk<SessionDomainState>('session.state.create', {
    sessions,
    currentSessionId,
  });
}

export async function createChatDomainState(messages: QaMessage[]) {
  return invokeSdk<ChatDomainState>('chat.state.create', {
    messages,
  });
}

export async function applyMessageChunk(state: ChatDomainState, chunk: MessageChunk) {
  return invokeSdk<{ nextState: ChatDomainState; nextAnswer: string }>('chat.chunk.apply', {
    state,
    chunk,
  });
}

export async function syncDomainStatesFromSession(detail: QaSessionDetail) {
  return invokeSdk<{ sessionState: SessionDomainState; chatState: ChatDomainState }>('session.state.sync', {
    detail,
  });
}

export async function bootstrapSessionsWithSdk(options: { keyword?: string; pageNum?: number; pageSize?: number } = {}) {
  // 会话初始化由 SDK 同时返回列表、当前详情和领域状态，减少页面侧自行拼状态。
  return invokeSdk<SessionSdkResult>('session.bootstrap', options);
}

export async function selectSessionWithSdk(sessionId: number) {
  return invokeSdk<SessionSdkResult>('session.select', { sessionId });
}

export async function createSessionWithSdk(title?: string) {
  return invokeSdk<SessionSdkResult>('session.create', { title });
}

export async function renameSessionWithSdk(sessionId: number, title: string) {
  return invokeSdk<SessionSdkResult>('session.rename', { sessionId, title });
}

export async function deleteSessionWithSdk(sessionId: number) {
  return invokeSdk<SessionSdkResult>('session.delete', { sessionId });
}

export async function getSessionSnapshotWithSdk() {
  return invokeSdk<SessionSdkResult>('session.snapshot.get', {});
}

export async function listRecommendationsWithSdk() {
  return invokeSdk<{ list: RecommendationItem[] }>('recommendation.list', {});
}

export async function sendQuestionWithSdk(payload: SendQuestionPayload) {
  return invokeSdk<SessionSdkResult>('chat.send', payload);
}

export async function getEvidenceWithSdk(messageId: number) {
  return invokeSdk<EvidenceDetail>('chat.evidence', { messageId });
}

export async function listFavoritesWithSdk(options: {
  keyword?: string;
  favoriteType?: 'MESSAGE' | 'SESSION';
  pageNum?: number;
  pageSize?: number;
} = {}) {
  // 收藏列表只取概览，详情由 getFavoriteDetailWithSdk 在展开 Collapse 时懒加载。
  return invokeSdk<PaginatedResult<FavoriteItemSummary>>('favorite.list', options);
}

export async function getFavoriteDetailWithSdk(favoriteId: number) {
  return invokeSdk<FavoriteItemDetail>('favorite.detail', { favoriteId });
}

export async function favoriteMessageWithSdk(messageId: number) {
  return invokeSdk<{ favoriteId: number; messageId: number; favorite: boolean }>('favorite.add', { messageId });
}

export async function cancelFavoriteWithSdk(favoriteId: number) {
  return invokeSdk<null>('favorite.remove', { favoriteId });
}

export async function submitFeedbackWithSdk(messageId: number, feedbackType: FeedbackType, feedbackReason?: string) {
  return invokeSdk<{ messageId: number; feedbackType: FeedbackType }>('feedback.submit', {
    messageId,
    feedbackType,
    feedbackReason,
  });
}

export async function getMonitorOverviewWithSdk(query: MonitorOverviewQuery = {}) {
  return invokeSdk<MonitorOverview>('monitor.overview', query);
}

export async function listMonitorRequestsWithSdk(query: MonitorRequestQuery = {}) {
  return invokeSdk<AdminPaginatedResult<MonitorRequestSummary>>('monitor.requests.list', query);
}

export async function getMonitorRequestDetailWithSdk(requestId: string) {
  return invokeSdk<MonitorRequestDetail>('monitor.requests.detail', { requestId });
}

export async function getMonitorNlpDetailWithSdk(requestId: string) {
  return invokeSdk<MonitorNlpDetail>('monitor.requests.nlp', { requestId });
}

export async function getMonitorGraphRetrievalDetailWithSdk(requestId: string) {
  return invokeSdk<MonitorGraphRetrievalDetail>('monitor.requests.graph_retrieval', { requestId });
}

export async function getMonitorPromptDetailWithSdk(query: MonitorPromptDetailQuery) {
  return invokeSdk<MonitorPromptDetail>('monitor.requests.prompt', query);
}

export async function getMonitorAiCallDetailWithSdk(requestId: string) {
  return invokeSdk<MonitorAiCallDetail>('monitor.requests.ai_call', { requestId });
}

export async function getMonitorTimingDetailWithSdk(requestId: string) {
  return invokeSdk<MonitorTimingDetail>('monitor.requests.timings', { requestId });
}

export async function getMonitorTrendWithSdk(query: MonitorTrendQuery) {
  return invokeSdk<MonitorTrendItem[]>('monitor.statistics.trend', query);
}

export async function getMonitorTopQuestionsWithSdk(query: MonitorTopQuestionQuery = {}) {
  return invokeSdk<MonitorTopQuestionItem[]>('monitor.statistics.top_questions', query);
}

export async function getMonitorPerformanceWithSdk(query: MonitorPerformanceQuery = {}) {
  return invokeSdk<MonitorPerformanceStatistics>('monitor.statistics.performance', query);
}

export async function listExceptionLogsWithSdk(query: ExceptionLogQuery = {}) {
  return invokeSdk<AdminPaginatedResult<ExceptionLogSummary>>('exception_logs.list', query);
}

export async function getExceptionLogDetailWithSdk(exceptionId: string) {
  return invokeSdk<ExceptionLogDetail>('exception_logs.detail', { exceptionId });
}

export async function getExceptionLogSummaryWithSdk(query: MonitorPerformanceQuery = {}) {
  return invokeSdk<ExceptionLogSummaryStatistics>('exception_logs.summary', query);
}

export async function updateExceptionHandleStatusWithSdk(
  exceptionId: string,
  payload: ExceptionHandleStatusPayload,
) {
  return invokeSdk<boolean>('exception_logs.handle_status.update', {
    exceptionId,
    ...payload,
  });
}

export async function batchUpdateExceptionHandleStatusWithSdk(payload: BatchExceptionHandleStatusPayload) {
  return invokeSdk<BatchHandleStatusResult>('exception_logs.handle_status.batch_update', payload);
}
