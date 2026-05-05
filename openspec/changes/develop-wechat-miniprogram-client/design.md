## Context

当前仓库是 `pnpm workspace + turbo` 的多端前端工程，已有 `apps/web`、`apps/electron` 和共享包。`/Users/a123/Desktop/mds-c` 提供了用户端 PC Web 原型、接口文档和流式接口分析，小程序端尚未存在工程目录。

微信小程序端需要在移动端约束下复用同一套用户端业务：账号登录、问答首页、历史会话、SSE 流式问答、知识依据、收藏和反馈。后端接口仍以 `/api/auth/**` 与 `/api/client/**` 为主，除登录外默认携带 JWT。

## Goals / Non-Goals

**Goals:**

- 在 `apps/miniprogram` 新增可被微信开发者工具打开的小程序工程。
- 小程序端必须通过 SDK 接入层调用业务能力，页面和 store 只能依赖 SDK façade，不直接依赖 HTTP services。
- 基于 C 端接口文档实现完整用户链路：登录、会话、问答、流式生成、取消、依据、收藏、反馈。
- 适配小程序移动端交互，不照搬 PC 三栏布局。
- 建立小程序专属 API、存储、鉴权、错误处理和流式解析基础设施。
- 保留 Web/Electron 当前代码行为，不引入破坏性改动。

**Non-Goals:**

- 不在本变更中重构 Web 端 UI 或 Rust SDK 架构。
- 不实现微信原生登录、手机号登录或 OPENID/UNIONID 身份体系。
- 不新增后端接口或修改数据库结构；如联调发现接口缺口，另行记录。
- 不要求本地命令行直接完成真机预览，真机验证依赖微信开发者工具或 `miniprogram-ci` 配置。

## Decisions

### 1. 新增原生微信小程序应用，而不是将 Web 页面打包进 WebView

采用 `apps/miniprogram` 原生小程序目录，包含 `app.js`、`app.json`、`project.config.json`、`pages/**`、`components/**`、`services/**` 和 `stores/**`。

原因：问答输入、滚动、操作栏、收藏列表和依据面板都需要移动端原生体验；WebView 会增加登录态、流式请求、样式适配和审核风险。原生工程也更适合后续用微信开发者工具预览和上传。

备选方案是 uni-app/Taro 等跨端框架。当前仓库已有 Web/Electron 多端结构，但小程序端第一版目标是快速可控交付，暂不引入额外编译层。

### 2. 小程序端先使用 JavaScript 原生工程，业务类型通过 JSDoc 与接口模型约束

小程序首版使用 JavaScript/WXML/WXSS/JSON，避免 TypeScript 编译链、npm 构建和 DevTools 插件配置在第一阶段阻塞。核心接口模型在 `services/types.js` 通过注释维护，后续可迁移到 TypeScript 或生成共享类型。

备选方案是 TypeScript 小程序工程。它类型更强，但需要额外构建配置，当前更适合作为第二阶段优化。

### 3. 小程序端必须新增 SDK 接入层，HTTP services 只作为 transport

`apps/miniprogram/sdk/miniprogramSdk.js` 是小程序端业务入口；`apps/miniprogram/sdk/sdkTransport.js` 将 SDK method 分发到小程序 HTTP services；`apps/miniprogram/sdk/sdkStorage.js` 将 SDK storage 语义映射到 `wx.setStorageSync` / `wx.getStorageSync`。

页面、组件和 store MUST 通过 SDK façade 调用认证、会话、问答、依据、收藏和反馈能力，不得直接把 `services/*Api.js` 作为业务入口。`services/request.js` 只负责 baseURL、JWT 注入、统一 Result 解包、登录失效处理和错误提示。

原因：现有 Web SDK 依赖 WASM 与浏览器 `fetch` 接入方式，小程序运行时需要 `wx.request`、本地 storage 和 chunk 接收能力。新增小程序 SDK 接入层可以保留 SDK 的 method + payload 契约，同时隔离小程序平台差异。

### 4. 流式问答使用 `wx.request` chunk 接收能力并实现 SSE 解析

小程序端 `qaStreamService` 使用 `wx.request`，在支持 `enableChunked` 和 `onChunkReceived` 的环境中按增量解析 SSE block。解析逻辑需要兼容 `event:` 与 `data:` 行，分别处理 `start`、`stage`、`tool_call`、`chunk`、`done`、`error`。

当运行环境不支持 chunk 回调或后端/代理不透传流式响应时，页面必须降级为提交中状态并在请求结束后使用终态结果更新消息，避免界面卡死。

### 5. 移动端信息架构采用“首页主问答 + 抽屉/弹层”

PC 原型的左侧会话栏和右侧知识依据面板在小程序端改为：

- 顶部导航区：当前会话标题、新建会话、历史入口。
- 主体：消息流、阶段状态、回答正文、操作区。
- 底部：固定输入栏，支持发送、停止生成、上下文模式和回答模式。
- 会话历史：底部弹层或独立页面。
- 知识依据：独立详情页或抽屉式页面。
- 用户菜单：我的收藏、退出登录。

这样能保持问答优先，同时避免移动端横向拥挤。

## Risks / Trade-offs

- [Risk] 小程序基础库或开发者工具版本不支持 chunk 接收 → 通过环境检测和非流式/终态降级避免主链路不可用。
- [Risk] 后端 SSE 经过网关后被缓冲 → 联调时记录代理配置要求，必要时临时使用非流式接口验证业务闭环。
- [Risk] Web 端 WASM SDK 不能无改造直接运行在小程序 → 首版新增小程序 SDK adapter，保持 method + payload 业务契约；后续如编译出小程序可用 WASM 包，可替换 `miniprogramSdk` 内部实现而不改页面。
- [Risk] 小程序屏幕空间有限，依据与 workflow 信息过载 → 默认只展示轻量状态和摘要，详情按需进入依据页。
- [Risk] 缺少真实 AppID 或合法域名配置 → 工程使用占位配置，本地可用开发者工具“不校验合法域名”联调，正式预览前补齐配置。

## Migration Plan

1. 新增 `apps/miniprogram`，不影响现有 Web/Electron。
2. 新增 `apps/miniprogram/sdk`，让页面和 store 统一接入 SDK façade。
3. 增加根脚本和 workspace 识别，保持现有 `pnpm build`、`typecheck` 行为兼容。
4. 使用微信开发者工具打开 `apps/miniprogram` 验证页面和基础配置。
5. 联调时配置 API baseURL、AppID 和合法域名。
6. 如需回滚，移除 `apps/miniprogram` 和相关脚本即可，不影响现有应用。

## Open Questions

- 小程序正式 AppID、项目名称和合法请求域名尚未提供。
- 后端流式接口在目标部署链路中是否稳定透传 SSE，需要联调确认。
- 是否需要在小程序首版接入微信原生身份，目前按账号密码登录处理。
