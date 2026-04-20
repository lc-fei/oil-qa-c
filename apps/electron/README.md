# apps/electron

Electron 壳层占位工程。

## 职责

- 预留 `main`
- 预留 `preload`
- 预留 `renderer`
- 后续承接 Electron 平台能力桥接

## 当前状态

- 可参与 workspace 构建
- 还没有真实 Electron 运行逻辑
- renderer 后续优先复用 `apps/web` 与共享包

## 常用命令

```bash
pnpm --filter @oil-qa-c/electron typecheck
pnpm --filter @oil-qa-c/electron build
```
