export type UserRole = string;
export type MessageLifecycleStatus = 'IDLE' | 'STREAMING' | 'SUCCESS' | 'FAILED' | 'INTERRUPTED';
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

export interface AuthDomainState {
  token: string | null;
  currentUser: CurrentUser | null;
  status: 'ANONYMOUS' | 'AUTHENTICATED' | 'EXPIRED';
  lastEvent?: DomainEvent;
}

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

export interface MessageChunk {
  messageId: number;
  requestNo: string;
  delta: string;
  done: boolean;
  sequence: number;
  errorMessage?: string;
}

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
  nodeId: string;
  nodeName: string;
  nodeType: string;
}

export interface EvidenceGraphEdge {
  sourceId: string;
  targetId: string;
  relationType: string;
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
