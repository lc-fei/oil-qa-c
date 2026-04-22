import type {
  AuthDomainState,
  ChatDomainState,
  CurrentUser,
  EvidenceDetail,
  MessageChunk,
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
      return tokenStorage.getToken();
    }

    if (request.action === 'set') {
      tokenStorage.setToken(request.value ?? '');
      return null;
    }

    tokenStorage.clearToken();
    return null;
  };
}

async function loadGeneratedModule() {
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
