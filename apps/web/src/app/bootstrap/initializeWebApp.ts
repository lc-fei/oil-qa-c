import { configureApiRuntime } from '@oil-qa-c/api';
import { getRuntimeEnv } from '@oil-qa-c/shared';
import { initWasmSdk } from '@oil-qa-c/wasm-sdk';

let initialized = false;
let initializationTask: Promise<void> | null = null;

// 只执行一次全局初始化，避免 React 严格模式下重复触发副作用。
export function initializeWebApp() {
  if (initialized) {
    return initializationTask ?? Promise.resolve();
  }

  if (initializationTask) {
    return initializationTask;
  }

  const runtime = getRuntimeEnv();

  // API 基础地址由 Web 入口统一注入，避免共享包直接依赖 Vite 运行时。
  configureApiRuntime({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  });

  // 先完成 wasm SDK 初始化，再进入后续的认证恢复和页面渲染流程。
  initializationTask = initWasmSdk({
    runtime,
    source: 'web-bootstrap',
  }).then(() => {
    initialized = true;
  });

  return initializationTask;
}
