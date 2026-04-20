# packages/wasm-sdk

Rust wasm 的前端适配层。

## 职责

- 初始化真实 wasm 产物
- 调用 Rust 导出函数
- 向前端暴露可消费的 TS API

## 当前状态

- 已接入真实 `wasm-pack` 产物
- 默认从 `pkg/oil_qa_wasm.js` 加载
- 不再保留 TS 版领域规则替代实现

## 构建产物

真实产物目录：

- `packages/wasm-sdk/pkg/`

典型文件：

- `oil_qa_wasm.js`
- `oil_qa_wasm_bg.wasm`

## 常用命令

```bash
pnpm --filter @oil-qa-c/wasm-sdk typecheck
pnpm --filter @oil-qa-c/wasm-sdk build
pnpm --filter @oil-qa-c/wasm-sdk wasm:build
```

实际推荐在仓库根目录执行：

```bash
pnpm build:wasm
```
