# packages/store

前端 UI 状态层。

## 职责

- 持有页面状态
- 持有 SDK 输出的领域状态快照
- 为 React 页面提供统一状态入口

## 当前 slice

- `useAppStore`
- `useAuthStore`
- `useSessionStore`
- `useChatStore`
- `useEvidenceStore`
- `useFavoriteStore`

## 边界

- 这里不定义领域核心规则
- 领域规则由 Rust SDK / `packages/wasm-sdk` 输出
- store 只负责保存快照和 UI 状态

## 常用命令

```bash
pnpm --filter @oil-qa-c/store typecheck
pnpm --filter @oil-qa-c/store build
```
