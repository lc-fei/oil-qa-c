# rust-sdk

Rust 领域核心层。

## 职责

- 认证领域状态
- 会话领域状态
- 消息领域状态
- 领域事件
- 流式 chunk 处理
- evidence / 图谱整理
- 真实 wasm 导出

## 目录

```text
rust-sdk/
├─ crates/
│  ├─ core/
│  ├─ auth/
│  ├─ qa/
│  ├─ graph/
│  ├─ favorite/
│  ├─ cache/
│  └─ platform/
└─ bindings/
   └─ wasm/
```

## 说明

- `crates/*` 负责 Rust 领域核心
- `bindings/wasm` 负责 Web 端导出
- 前端通过 `packages/wasm-sdk` 消费这些导出

## 常用命令

```bash
cd rust-sdk
cargo check
cargo test
```

只检查 wasm binding：

```bash
cd rust-sdk
cargo check -p oil-qa-wasm
```
