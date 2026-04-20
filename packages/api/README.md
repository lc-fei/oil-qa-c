# packages/api

接口传输层。

## 职责

- HTTP 请求发送
- token 注入
- `Result` 包装结构解包
- 接口路径与模块组织

## 当前模块

- `authApi`
- `qaSessionApi`
- `qaChatApi`
- `favoriteApi`
- `feedbackApi`
- `recommendationApi`

## 边界

- 这里只负责“请求传输”
- 不负责领域状态机
- 不负责页面流程
- 不负责 UI 状态

## 常用命令

```bash
pnpm --filter @oil-qa-c/api typecheck
pnpm --filter @oil-qa-c/api build
```
