declare module '../pkg/oil_qa_wasm.js' {
  export default function init(
    input?: RequestInfo | URL | Response | BufferSource | WebAssembly.Module,
  ): Promise<unknown>;

  export function sdk_status(): string;
}
