# apps/web

当前真实运行的 Web 应用。

## 职责

- React 应用入口
- 路由与页面渲染
- 用户交互
- SDK 状态到界面的映射
- 本地开发时 `/api` 代理配置

## 当前页面

- `/login`
- `/chat`
- `/favorites`

## 常用命令

```bash
pnpm --filter @oil-qa-c/web dev
pnpm --filter @oil-qa-c/web typecheck
pnpm --filter @oil-qa-c/web build
```

## 说明

- 登录页默认填充本地调试账号 `client / 123456`
- 本地开发默认把 `/api` 代理到 `http://localhost:8080`
- 依赖真实 wasm 产物时，请先在仓库根目录执行 `pnpm build:wasm`
