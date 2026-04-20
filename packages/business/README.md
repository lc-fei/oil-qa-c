# packages/business

业务编排层。

## 职责

- 页面动作编排
- API 调用组织
- 调用 `packages/wasm-sdk`
- 串联 store 与页面流程

## 当前服务

- `authService`
- `qaSessionService`
- `qaChatService`
- `favoriteService`
- `recommendationService`

## 边界

- 这里是 orchestration 层
- 不应重复实现 Rust SDK 已经定义的领域规则

## 常用命令

```bash
pnpm --filter @oil-qa-c/business typecheck
pnpm --filter @oil-qa-c/business build
```
