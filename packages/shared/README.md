# packages/shared

共享基础层。

## 职责

- 公共类型定义
- 路由常量
- 平台抽象接口
- 多端共享的基础数据结构

## 典型内容

- `CurrentUser`
- `AuthDomainState`
- `SessionDomainState`
- `ChatDomainState`
- `routes`
- `getTokenStorage()`

## 常用命令

```bash
pnpm --filter @oil-qa-c/shared typecheck
pnpm --filter @oil-qa-c/shared build
```
