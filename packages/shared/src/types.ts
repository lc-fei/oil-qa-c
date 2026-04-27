export type UserRole = string;
export type MessageLifecycleStatus = 'IDLE' | 'STREAMING' | 'SUCCESS' | 'FAILED' | 'INTERRUPTED';

// 领域事件类型需要同时被 Rust SDK 和 Web 展示层理解，用于跨端同步状态变化。
export type DomainEventType =
  | 'AuthLoggedIn'
  | 'AuthLoggedOut'
  | 'AuthExpired'
  | 'SessionCreated'
  | 'SessionRenamed'
  | 'SessionDeleted'
  | 'SessionSwitched'
  | 'MessageSubmitted'
  | 'MessageChunkReceived'
  | 'MessageCompleted'
  | 'MessageFailed'
  | 'EvidenceLoaded'
  | 'FavoriteAdded'
  | 'FavoriteRemoved'
  | 'FeedbackSubmitted';

export interface CurrentUser {
  userId: number;
  username: string;
  account: string;
  nickname?: string | null;
  roles: UserRole[];
  status: number;
}

// 认证接口模型必须与接口文档保持一致，登录字段使用 account/password。
export interface LoginRequest {
  account: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userId: number;
  username: string;
  account: string;
  roles: UserRole[];
}

// 领域状态是 SDK 输出给客户端的稳定契约，客户端不直接推导业务状态。
export interface AuthDomainState {
  token: string | null;
  currentUser: CurrentUser | null;
  status: 'ANONYMOUS' | 'AUTHENTICATED' | 'EXPIRED';
  lastEvent?: DomainEvent;
}

// 问答消息模型对应会话详情和发送问题后的展示结构。
export interface QaMessage {
  messageId: number;
  messageNo: string;
  requestNo: string;
  question: string;
  answer: string;
  answerSummary: string;
  status: 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'INTERRUPTED' | 'PARTIAL_SUCCESS';
  createdAt: string;
  finishedAt?: string;
  favorite: boolean;
  feedbackType: 'LIKE' | 'DISLIKE' | null;
}

// 发送问题由 SDK 统一发起，Web 层只提供用户输入和当前会话上下文。
export interface SendQuestionPayload {
  sessionId?: number;
  question: string;
  contextMode?: 'ON' | 'OFF';
  answerMode?: 'GRAPH_ENHANCED' | 'LLM_ONLY';
}

export interface ChatTimings {
  totalDurationMs: number;
  nlpDurationMs: number;
  graphDurationMs: number;
  promptDurationMs: number;
  aiDurationMs: number;
}

export interface EvidenceSummary {
  graphHit: boolean;
  entityCount: number;
  relationCount: number;
  confidence: number;
}

export interface SendQuestionResponse {
  sessionId: number;
  sessionNo: string;
  messageId: number;
  messageNo: string;
  requestNo: string;
  question: string;
  answer: string;
  answerSummary: string;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL_SUCCESS' | 'INTERRUPTED';
  followUps: string[];
  timings: ChatTimings;
  evidenceSummary: EvidenceSummary;
}

// 流式分片模型由前端实时消费，最终结果仍交由 SDK 归并为权威消息状态。
export interface MessageChunk {
  messageId: number;
  messageNo?: string;
  sessionId?: number;
  sessionNo?: string;
  requestNo: string;
  delta: string;
  done: boolean;
  sequence: number;
  errorMessage?: string | null;
}

export interface StreamStartResult {
  clientMessageId: number;
  requestNo: string;
  sessionId: number;
}

export interface StreamFinishPayload {
  clientMessageId: number;
  response: SendQuestionResponse;
}

export interface StreamFailPayload {
  clientMessageId: number;
  errorMessage: string;
  partialAnswer?: string;
}

export interface StreamCancelPayload {
  clientMessageId: number;
  partialAnswer?: string;
}

// 会话列表使用轻量摘要，消息正文统一由会话详情接口提供。
export interface QaSessionSummary {
  sessionId: number;
  sessionNo: string;
  title: string;
  lastQuestion: string;
  messageCount: number;
  updatedAt: string;
  isFavorite: boolean;
}

export interface QaSessionDetail {
  sessionId: number;
  sessionNo: string;
  title: string;
  messages: QaMessage[];
}

export interface DomainEvent<TPayload = Record<string, unknown>> {
  type: DomainEventType;
  occurredAt: string;
  payload: TPayload;
}

export interface SessionDomainState {
  currentSessionId: number | null;
  orderedSessionIds: number[];
  emptySession: boolean;
  lastEvent?: DomainEvent;
}

export interface ChatDomainState {
  activeMessageId: number | null;
  status: MessageLifecycleStatus;
  messageIds: number[];
  streamBuffer: Record<number, string>;
  lastEvent?: DomainEvent;
}

export interface EvidenceDomainState {
  currentMessageId: number | null;
  availableMessageIds: number[];
  lastEvent?: DomainEvent;
}

export interface FavoriteDomainState {
  favoriteMessageIds: number[];
  lastEvent?: DomainEvent;
}

// 依据数据拆为实体、关系、图谱和来源，页面按模块独立渲染和降级。
export interface EvidenceEntity {
  entityId: string;
  entityName: string;
  entityType: string;
}

export interface EvidenceRelation {
  sourceName: string;
  relationType: string;
  targetName: string;
}

export interface EvidenceSource {
  sourceType: 'GRAPH_RELATION' | 'GRAPH_SUMMARY' | 'PROMPT_SUMMARY';
  title: string;
  content: string;
}

export interface EvidenceGraphNode {
  id: string;
  name: string;
  typeCode: string | null;
  typeName: string | null;
  entityId: string;
  entityName: string;
  entityType: string | null;
  properties: Record<string, unknown>;
}

export interface EvidenceGraphEdge {
  id: string;
  source: string;
  target: string;
  sourceId: string;
  targetId: string;
  sourceName: string;
  targetName: string;
  relationTypeCode: string | null;
  relationTypeName: string | null;
  relationType: string;
  description: string | null;
}

export interface EvidenceGraphData {
  center: EvidenceEntity | null;
  nodes: EvidenceGraphNode[];
  edges: EvidenceGraphEdge[];
}

export interface EvidenceDetail {
  messageId: number;
  requestNo: string;
  entities: EvidenceEntity[];
  relations: EvidenceRelation[];
  graphData: EvidenceGraphData;
  sources: EvidenceSource[];
  timings: ChatTimings;
  confidence: number;
}

export interface FavoriteItemSummary {
  favoriteId: number;
  favoriteType: 'MESSAGE' | 'SESSION';
  sessionId: number;
  messageId: number;
  title: string;
  createdAt: string;
}

// 收藏列表只返回摘要；详情中的问答正文按展开行为懒加载。
export interface FavoriteItemDetail extends FavoriteItemSummary {
  question: string;
  answer: string;
}

export type FeedbackType = 'LIKE' | 'DISLIKE';

export interface RecommendationItem {
  id: number;
  questionText: string;
  questionType: string;
  sortNo: number;
}

export interface PaginatedResult<T> {
  total: number;
  list: T[];
}

export interface AdminPaginatedResult<T> extends PaginatedResult<T> {
  pageNum?: number;
  pageSize?: number;
}

export type MonitorRangeType = 'today' | 'last7days' | 'last30days' | 'custom';
export type MonitorRequestStatus = 'SUCCESS' | 'FAILED' | 'PROCESSING' | 'PARTIAL_SUCCESS' | 'TIMEOUT';
export type MonitorRequestSource = 'CLIENT_WEB' | 'ADMIN_DEBUG' | 'OPEN_API' | 'SCHEDULE_TASK' | 'UNKNOWN';
export type MonitorAiCallStatus = 'SUCCESS' | 'FAILED' | 'TIMEOUT' | 'RETRY_SUCCESS' | 'RETRY_FAILED';
export type ExceptionLevel = 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
export type ExceptionHandleStatus = 'UNHANDLED' | 'HANDLING' | 'HANDLED' | 'IGNORED';

export interface MonitorOverviewQuery {
  rangeType?: MonitorRangeType;
  startTime?: string;
  endTime?: string;
}

export interface MonitorOverview {
  totalQaCount: number;
  successQaCount: number;
  failedQaCount: number;
  avgResponseTimeMs: number;
  aiCallCount: number;
  graphHitCount: number;
  graphHitRate: number;
  exceptionCount: number;
  onlineAdminUserCount: number;
  successRate: number;
}

export interface MonitorRequestQuery {
  pageNum?: number;
  pageSize?: number;
  keyword?: string;
  requestStatus?: MonitorRequestStatus;
  requestSource?: MonitorRequestSource;
  startTime?: string;
  endTime?: string;
  minDurationMs?: number;
  maxDurationMs?: number;
  hasGraphHit?: 0 | 1;
  hasException?: 0 | 1;
}

export interface MonitorRequestSummary {
  requestId: string;
  question: string;
  requestTime: string;
  requestSource: MonitorRequestSource;
  requestStatus: MonitorRequestStatus;
  responseSummary: string;
  totalDurationMs: number;
  graphHit: boolean;
  aiCallStatus: MonitorAiCallStatus;
  exceptionFlag: boolean;
}

export interface MonitorRequestDetail {
  requestId: string;
  question: string;
  requestTime: string;
  requestSource: MonitorRequestSource;
  requestStatus: MonitorRequestStatus;
  totalDurationMs: number;
  finalAnswer: string;
  responseSummary: string;
  graphHit: boolean;
  exceptionFlag: boolean;
  traceId: string;
  userId: string;
  userAccount: string;
}

export interface MonitorNlpDetail {
  requestId: string;
  tokenizeResult: string[];
  keywordList: string[];
  entityList: Array<Record<string, unknown>>;
  intent: string;
  confidence: number;
  durationMs: number;
  rawResult?: Record<string, unknown> | null;
}

export interface MonitorGraphRetrievalDetail {
  requestId: string;
  queryCondition: Record<string, unknown>;
  hitEntityList: Array<Record<string, unknown>>;
  hitRelationList: Array<Record<string, unknown>>;
  hitPropertySummary: string[];
  resultCount: number;
  validHit: boolean;
  durationMs: number;
}

export interface MonitorPromptDetailQuery {
  requestId: string;
  includeFullText?: 0 | 1;
}

export interface MonitorPromptDetail {
  requestId: string;
  originalQuestion: string;
  graphSummary: string;
  promptSummary: string;
  promptContent?: string | null;
  generatedTime: string;
  durationMs: number;
}

export interface MonitorAiCallDetail {
  requestId: string;
  modelName: string;
  provider: string;
  callTime: string;
  aiCallStatus: MonitorAiCallStatus;
  responseStatusCode: number;
  durationMs: number;
  resultSummary: string;
  errorMessage?: string | null;
  retryCount: number;
}

export interface MonitorTimingPhase {
  phaseCode: string;
  phaseName: string;
  durationMs: number;
  success: boolean;
}

export interface MonitorTimingDetail {
  requestId: string;
  totalDurationMs: number;
  phases: MonitorTimingPhase[];
}

export interface MonitorTrendQuery {
  metricType: 'qaCount' | 'successRate' | 'avgDuration' | 'exceptionCount' | 'graphHitRate';
  granularity?: 'day' | 'week';
  startDate: string;
  endDate: string;
}

export interface MonitorTrendItem {
  statDate: string;
  metricValue: number;
}

export interface MonitorTopQuestionQuery {
  startDate?: string;
  endDate?: string;
  topN?: number;
}

export interface MonitorTopQuestionItem {
  question: string;
  count: number;
}

export interface MonitorPerformanceQuery {
  startTime?: string;
  endTime?: string;
}

export interface MonitorPerformanceStatistics {
  avgResponseTimeMs: number;
  p95ResponseTimeMs: number;
  nlpAvgDurationMs: number;
  graphAvgDurationMs: number;
  promptAvgDurationMs: number;
  aiAvgDurationMs: number;
  successRate: number;
  graphHitRate: number;
  aiFailureRate: number;
}

export interface ExceptionLogQuery {
  pageNum?: number;
  pageSize?: number;
  exceptionModule?: string;
  exceptionLevel?: ExceptionLevel;
  handleStatus?: ExceptionHandleStatus;
  keyword?: string;
  startTime?: string;
  endTime?: string;
  traceId?: string;
  requestId?: string;
}

export interface ExceptionLogSummary {
  exceptionId: string;
  exceptionModule: string;
  exceptionLevel: ExceptionLevel;
  exceptionType: string;
  exceptionMessage: string;
  requestId?: string | null;
  traceId: string;
  occurredTime: string;
  handleStatus: ExceptionHandleStatus;
  handlerName?: string | null;
  handledTime?: string | null;
}

export interface ExceptionLogDetail extends ExceptionLogSummary {
  stackTrace: string;
  requestUri: string;
  requestMethod: string;
  requestParamSummary: string;
  contextInfo: Record<string, unknown>;
  handleRemark?: string | null;
  handlerId?: string | null;
}

export interface ExceptionTopModuleItem {
  module: string;
  count: number;
}

export interface ExceptionLogSummaryStatistics {
  totalCount: number;
  unhandledCount: number;
  handlingCount: number;
  handledCount: number;
  ignoredCount: number;
  errorCount: number;
  fatalCount: number;
  topModuleList: ExceptionTopModuleItem[];
}

export interface ExceptionHandleStatusPayload {
  handleStatus: ExceptionHandleStatus;
  handleRemark?: string;
}

export interface BatchExceptionHandleStatusPayload extends ExceptionHandleStatusPayload {
  exceptionIds: string[];
}

export interface BatchHandleStatusResult {
  successCount: number;
  failCount: number;
}

export interface RuntimeEnv {
  platform: 'web' | 'electron';
  mode: 'development' | 'production' | 'test';
}
