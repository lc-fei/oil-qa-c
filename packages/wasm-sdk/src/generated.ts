// 这里描述 wasm-pack 生成物的最小形状，统一通过单一 invoke 入口调用 Rust SDK。
export interface GeneratedWasmModule {
  default(input?: RequestInfo | URL | Response | BufferSource | WebAssembly.Module): Promise<unknown>;
  register_transport(handler: (request: unknown) => Promise<unknown>): void;
  register_storage(handler: (request: unknown) => Promise<unknown>): void;
  sdk_invoke(method: string, payload: unknown): Promise<unknown>;
}
