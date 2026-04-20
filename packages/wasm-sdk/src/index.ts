import type {
  AuthDomainState,
  ChatDomainState,
  MessageChunk,
  CurrentUser,
  QaMessage,
  QaSessionDetail,
  QaSessionSummary,
  RuntimeEnv,
  SessionDomainState,
} from '@oil-qa-c/shared';
import type { GeneratedWasmModule } from './generated';

interface InitWasmSdkOptions {
  runtime: RuntimeEnv;
  source: string;
}

let wasmSdkReady = false;
let generatedModule: GeneratedWasmModule | null = null;

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
  await module.default();
  console.info('init wasm sdk success', {
    ...options,
    mode: 'wasm',
    sdkStatus: module.sdk_status(),
  });

  wasmSdkReady = true;
}

export function isWasmSdkReady() {
  return wasmSdkReady;
}

function getWasmModule() {
  if (!generatedModule) {
    throw new Error('WASM SDK 尚未初始化，请先完成 initWasmSdk');
  }

  return generatedModule;
}

export function generateSessionTitle(question: string) {
  return getWasmModule().generate_session_title(question);
}

export function createAuthenticatedState(token: string, currentUser: CurrentUser): AuthDomainState {
  return getWasmModule().create_authenticated_state(token, currentUser) as AuthDomainState;
}

export function createAnonymousAuthState(): AuthDomainState {
  return getWasmModule().create_anonymous_auth_state() as AuthDomainState;
}

export function createExpiredAuthState(): AuthDomainState {
  return getWasmModule().create_expired_auth_state() as AuthDomainState;
}

export function createSessionDomainState(
  sessions: QaSessionSummary[],
  currentSessionId: number | null,
): SessionDomainState {
  return getWasmModule().create_session_domain_state(sessions, currentSessionId) as SessionDomainState;
}

export function createChatDomainState(messages: QaMessage[]): ChatDomainState {
  return getWasmModule().create_chat_domain_state(messages) as ChatDomainState;
}

export function applyMessageChunk(
  state: ChatDomainState,
  chunk: MessageChunk,
): { nextState: ChatDomainState; nextAnswer: string } {
  return getWasmModule().apply_message_chunk(state, chunk) as {
    nextState: ChatDomainState;
    nextAnswer: string;
  };
}

export function syncDomainStatesFromSession(
  detail: QaSessionDetail,
): { sessionState: SessionDomainState; chatState: ChatDomainState } {
  return getWasmModule().sync_domain_states_from_session(detail) as {
    sessionState: SessionDomainState;
    chatState: ChatDomainState;
  };
}
