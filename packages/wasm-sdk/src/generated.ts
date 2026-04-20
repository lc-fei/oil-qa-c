// 这里描述 wasm-pack 生成物的最小形状，便于 TS 侧按约定加载真实 wasm。
export interface GeneratedWasmModule {
  default(input?: RequestInfo | URL | Response | BufferSource | WebAssembly.Module): Promise<unknown>;
  sdk_status(): string;
  generate_session_title(question: string): string;
  create_authenticated_state(token: string, currentUser: unknown): unknown;
  create_anonymous_auth_state(): unknown;
  create_expired_auth_state(): unknown;
  create_session_domain_state(sessions: unknown, currentSessionId: unknown): unknown;
  create_chat_domain_state(messages: unknown): unknown;
  apply_message_chunk(state: unknown, chunk: unknown): unknown;
  sync_domain_states_from_session(detail: unknown): unknown;
}
