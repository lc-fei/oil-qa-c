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
  status: 'PROCESSING' | 'SUCCESS' | 'FAILED';
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
  status: 'SUCCESS' | 'FAILED';
  followUps: string[];
  timings: ChatTimings;
  evidenceSummary: EvidenceSummary;
}

// 流式分片模型预留给后续 SSE/WebSocket 场景，当前同步问答也复用消息状态机。
export interface MessageChunk {
  messageId: number;
  requestNo: string;
  delta: string;
  done: boolean;
  sequence: number;
  errorMessage?: string;
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

export interface RuntimeEnv {
  platform: 'web' | 'electron';
  mode: 'development' | 'production' | 'test';
}
