## Context

当前仓库是 `pnpm workspace + turbo` monorepo，已有 `apps/web`、`apps/electron`、`apps/miniprogram` 和共享包。Web 端通过 `packages/wasm-sdk` 接入 Rust wasm，小程序端通过 `apps/miniprogram/sdk` 实现小程序运行时 façade。RN 端需要覆盖同一套 C 端用户链路，但运行时和 UI 约束不同：移动端使用原生导航、AsyncStorage、RN 网络能力和 Android / iOS 调试工具。

RN 首版必须复用 Rust SDK，不在 RN 侧复刻业务逻辑。移动端新增 Rust mobile binding，将现有 SDK 编译到 Android 和 iOS，并通过 RN 原生模块暴露统一 `invoke(method, payloadJson)` 能力。页面只能通过 RN TS façade 调用 SDK，不能直接调用 HTTP services。

## Goals / Non-Goals

**Goals:**

- 新增 `apps/mobile` React Native 应用，纳入 monorepo 和 turbo 工作流。
- 在 `rust-sdk` 增加 mobile 编译层，产出 Android `.so` 和 iOS `.xcframework`。
- 实现 Android / iOS 共用的登录、会话、问答、依据和收藏链路。
- 建立 RN 原生模块桥接层，包括 Android Kotlin/JNI、iOS Swift/Objective-C、TS façade 和事件监听。
- 移动端 UI 采用原生导航结构，不照搬 Web 三栏布局或小程序页面结构。
- 保持 Web、Electron、小程序现有行为不变。

**Non-Goals:**

- 不在本变更中重构 Web wasm 绑定。
- 不实现微信登录、Apple 登录、手机号登录等新认证方式。
- 不新增后端接口或修改接口字段。
- 不保证首版完成 App Store / 应用市场发布配置。

## Decisions

### 1. RN 工程目录使用 `apps/mobile`

使用 `apps/mobile` 表达移动 App 端，避免目录名绑定具体框架版本。工程纳入 `pnpm-workspace.yaml` 已覆盖的 `apps/*` 范围，新增 `@oil-qa-c/mobile` 包名。

备选方案是 `apps/react-native`。它更直观，但后续如果引入 Expo prebuild、原生模块或多移动端构建产物，`mobile` 更稳定。

### 2. 首版使用 Expo + TypeScript

首版采用 Expo 管理 React Native 工程，配合 TypeScript、React Navigation 和 AsyncStorage。Expo 降低 Android / iOS 本地环境门槛，仍可通过 prebuild 扩展原生能力。

备选方案是 React Native CLI。它原生控制力更强，但初始化和 CI 成本更高，不适合作为当前跨端基线的第一步。

### 3. RN 端新增原生 SDK Bridge，不直接复用 Web wasm

RN 端新增 `apps/mobile/modules/oil-qa-sdk` 原生模块和 `apps/mobile/src/sdk` TS façade。页面、hooks 和 store 只调用 TS façade；TS façade 调 RN Native Module；Native Module 调 Android/iOS Rust 原生库。

原因：Web wasm 依赖浏览器 wasm 初始化与 fetch 环境，小程序依赖 `wx.request`，RN 直接加载 Web `.wasm + JS glue` 不稳定。移动端应编译为平台原生库，RN 只承担桥接和页面呈现。

### 4. Rust SDK 新增 mobile binding 编译层

在 `rust-sdk/bindings/mobile` 新增移动端绑定层，推荐使用 UniFFI 暴露统一接口：

```text
invoke(method: String, payload_json: String) -> Result<String, SdkError>
```

目标产物：

- Android: `liboil_qa_sdk.so`，覆盖 `arm64-v8a`、`armeabi-v7a`、`x86_64`。
- iOS: `OilQaSdk.xcframework`，覆盖真机和模拟器。

RN 原生模块：

- Android: Kotlin + JNI / UniFFI generated binding。
- iOS: Swift / Objective-C + UniFFI generated binding。
- JS: `OilQaSdk.invoke(method, payload)` 和 SDK event subscription。

备选方案是 Rust C ABI + 手写 JNI/Swift bridge。该方案控制力更强，但内存管理、字符串、错误处理和异步事件成本更高。UniFFI 更适合作为首版移动端编译层。

### 5. 流式问答由 Rust SDK 管理，RN 通过事件监听接收状态

Rust SDK mobile binding 负责请求、SSE 解析、阶段状态和消息状态机。RN Native Module 通过 event emitter 向 JS 层推送 `start`、`stage`、`tool_call`、`chunk`、`done`、`error`。流程结束以 `done` 事件为准，不等待质量校验阶段。

如果首版 Rust mobile binding 的流式事件尚未稳定，必须保留非流式完成态兜底，但该兜底也应由 Rust SDK 暴露，不由 RN 侧直接访问后端接口。

### 6. 移动端信息架构采用 Stack + Modal/Sheet

RN 端页面结构：

- `LoginScreen`：账号登录。
- `SessionsScreen`：首页即历史会话列表，顶部新增会话，右上角我的入口。
- `ChatScreen`：消息流、阶段状态、底部输入栏和发送按钮。
- `EvidenceScreen`：消息知识依据详情。
- `FavoritesScreen` / `FavoriteDetailScreen`：收藏列表和详情。

这样能保留移动端问答主路径，同时把历史和依据放到按需进入的二级界面。

## Risks / Trade-offs

- [Risk] Rust mobile 编译链增加 Android NDK、iOS target 和 UniFFI 复杂度。Mitigation: 独立 `rust-sdk/bindings/mobile` 和构建脚本，先通过最小 `invoke` 验证双端链接。
- [Risk] RN 原生模块和 Expo managed workflow 存在边界。Mitigation: 使用 Expo prebuild / config plugin，或在需要时切换为 dev client。
- [Risk] RN SSE 能力在不同平台和调试环境表现不一致。Mitigation: SSE 由 Rust SDK 内部处理，RN 只监听 SDK 事件。
- [Risk] Expo 默认环境不包含部分 Node/Web API。Mitigation: 只在 RN adapter 内使用 RN 可用 API，不让页面直接依赖 Web SDK。
- [Risk] 移动端屏幕空间不足导致依据和 workflow 信息过载。Mitigation: 聊天页只展示当前阶段，完整依据进入详情页。
- [Risk] Android 模拟器访问本地后端地址不同于 iOS。Mitigation: runtime config 支持 per-platform baseURL，README 明确 `localhost`、`10.0.2.2` 和局域网地址用法。

## Migration Plan

1. 在 `rust-sdk/bindings/mobile` 新增 UniFFI binding 和 mobile 构建脚本。
2. 编译 Android `.so` 和 iOS `.xcframework`，完成最小 `invoke` 链路验证。
3. 新增 `apps/mobile` Expo RN 工程和基础脚本。
4. 新增 RN 原生模块桥接 Android/iOS Rust SDK。
5. 实现认证与启动鉴权，再实现问答主链路。
6. 补齐依据、收藏和错误态。
7. 增加 README、类型检查和基础运行说明。
8. 如需回滚，移除 `apps/mobile`、RN native module 和 `rust-sdk/bindings/mobile` 即可，不影响既有端。

## Open Questions

- 是否已有目标 Expo SDK / React Native 版本约束。
- Android / iOS 是否都需要首版真机验证，还是先以模拟器为准。
- 后端部署地址是否提供移动设备可访问的局域网或测试域名。
