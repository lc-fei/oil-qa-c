import { configureApiRuntime } from '@oil-qa-c/api';
import { getRuntimeEnv } from '@oil-qa-c/shared';
import { initWasmSdk } from '@oil-qa-c/wasm-sdk';

let initialized = false;

// 只执行一次全局初始化，避免 React 严格模式下重复触发副作用。
export function initializeWebApp() {
  if (initialized) {
    return;
  }

  const runtime = getRuntimeEnv();

  // API 基础地址由 Web 入口统一注入，避免共享包直接依赖 Vite 运行时。
  configureApiRuntime({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  });

  // wasm 当前仍是占位能力，这里先走一次统一初始化入口，后续可直接替换实现。
  void initWasmSdk({
    runtime,
    source: 'web-bootstrap',
  });

  initialized = true;
}
