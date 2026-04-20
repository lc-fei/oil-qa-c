# oil-qa-c

基于知识图谱的油井工程智能问答系统 C 端用户端前端仓库。

当前仓库采用：

- `pnpm workspace`
- `turbo`
- `apps + packages + rust-sdk` monorepo

并且已经打通：

- Web 前端开发与构建
- 真实 Rust wasm 构建产物输出
- 认证基础链路
- Rust SDK 领域核心层接入骨架

## 架构总览

```text
.
├─ apps/
│  ├─ web/           # 当前真实运行的 Web 应用
│  └─ electron/      # Electron 壳层占位工程
├─ packages/
│  ├─ shared/        # 共享类型、常量、平台抽象
│  ├─ api/           # 接口传输层
│  ├─ store/         # 前端 UI 状态层
│  ├─ business/      # 业务编排层
│  ├─ ui/            # 通用 UI 组件
│  └─ wasm-sdk/      # Rust wasm 前端适配层
├─ rust-sdk/         # Rust 领域核心层
├─ scripts/          # 构建脚本
├─ package.json
├─ pnpm-workspace.yaml
├─ turbo.json
└─ tsconfig.base.json
```

## 分层职责

- `apps/web`
  - 页面、路由、交互、UI 呈现
- `packages/business`
  - 业务编排，不重复定义领域规则
- `packages/api`
  - 请求传输、鉴权头注入、响应解包
- `packages/store`
  - UI 状态和 SDK 领域状态快照持有
- `packages/wasm-sdk`
  - Web 侧 wasm 初始化与 Rust 导出调用
- `rust-sdk`
  - 认证、会话、消息、领域事件、evidence 等核心规则

## 快速开始

### 1. 安装前端依赖

```bash
pnpm install
```

### 2. 准备 wasm 工具链

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
cargo install wasm-bindgen-cli
```

### 3. 构建真实 wasm 产物

```bash
pnpm build:wasm
```

成功后应看到：

- `packages/wasm-sdk/pkg/oil_qa_wasm.js`
- `packages/wasm-sdk/pkg/oil_qa_wasm_bg.wasm`

### 4. 启动后端

当前本地开发默认把 `/api` 代理到：

- `http://localhost:8080`

因此需要先启动 `/Users/a123/Desktop/server/oil-qa`。

### 5. 启动前端

```bash
pnpm dev
```

## 常用命令

### 根目录

- `pnpm install`
- `pnpm dev`
- `pnpm dev:web`
- `pnpm build`
- `pnpm build:wasm`
- `pnpm typecheck`
- `pnpm lint`

### Rust

- `cd rust-sdk && cargo check`
- `cd rust-sdk && cargo test`

## 调试账号

当前登录页默认填入本地调试账号：

- 账号：`client`
- 密码：`123456`

## `/api` 404 排查

如果你看到：

- `http://localhost:5173/api/auth/login`
- `404 Not Found`

优先检查：

1. 前端 dev server 是否已重启
2. 后端是否真的启动在 `8080`
3. `apps/web/vite.config.ts` 中的代理是否生效

## wasm 构建说明

当前项目的 Web 端优先加载 `packages/wasm-sdk/pkg/` 下的真实 wasm 产物，不再依赖 TS 版领域规则替代实现。

`pnpm build:wasm` 实际会调用：

- [scripts/build-wasm.sh](/Users/a123/Desktop/client/oil-qa-c/scripts/build-wasm.sh)

该脚本会：

- 自动清理坏代理变量
- 调用 `wasm-pack`
- 将产物输出到 `packages/wasm-sdk/pkg`

## 代理排障

当前项目已经在 wasm 构建脚本里自动清理以下变量：

- `HTTP_PROXY`
- `HTTPS_PROXY`
- `ALL_PROXY`
- `http_proxy`
- `https_proxy`
- `all_proxy`

如果你要手动排查环境，可执行：

```bash
env | grep -i proxy
```

如果手动运行 Rust/Cargo 命令，也建议先清理代理：

```bash
unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy
```

## 子模块文档

- [apps/web/README.md](/Users/a123/Desktop/client/oil-qa-c/apps/web/README.md)
- [apps/electron/README.md](/Users/a123/Desktop/client/oil-qa-c/apps/electron/README.md)
- [packages/shared/README.md](/Users/a123/Desktop/client/oil-qa-c/packages/shared/README.md)
- [packages/api/README.md](/Users/a123/Desktop/client/oil-qa-c/packages/api/README.md)
- [packages/store/README.md](/Users/a123/Desktop/client/oil-qa-c/packages/store/README.md)
- [packages/business/README.md](/Users/a123/Desktop/client/oil-qa-c/packages/business/README.md)
- [packages/ui/README.md](/Users/a123/Desktop/client/oil-qa-c/packages/ui/README.md)
- [packages/wasm-sdk/README.md](/Users/a123/Desktop/client/oil-qa-c/packages/wasm-sdk/README.md)
- [rust-sdk/README.md](/Users/a123/Desktop/client/oil-qa-c/rust-sdk/README.md)
