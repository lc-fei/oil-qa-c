## Why

现有 C 端已经覆盖 Web、Electron 壳层和微信小程序方向，但还没有面向 Android / iOS 的 React Native 客户端基线。RN 端需要在继续复用当前业务接口和 SDK 契约的前提下，提供原生移动端的登录、问答、流式回答、知识依据和收藏能力。

## What Changes

- 新增 React Native 应用工程，纳入当前 monorepo，作为 Android / iOS 移动端用户端入口。
- 在 Rust SDK 中新增 mobile 编译层，将 SDK 编译为 Android `.so` 和 iOS `.xcframework`，由 RN 原生模块桥接调用。
- 实现 RN 端账号登录、JWT 持久化、启动鉴权、退出登录和当前用户信息展示。
- 实现移动端问答工作台，包括会话列表、会话详情、提问、SSE 流式回答、阶段状态、知识依据和收藏。
- 实现 RN 端收藏列表与收藏详情，并支持从收藏项回到对应会话。
- 建立 RN 端基础导航、主题样式、运行时配置、错误处理和本地开发说明。
- 保留 Web、Electron 和微信小程序现有行为，不把 RN 适配改动扩散到既有端。

## Capabilities

### New Capabilities

- `react-native-app-shell`: RN 应用工程、导航、主题、运行时配置和 Android / iOS 启动入口。
- `react-native-sdk-adapter`: RN 端 Rust SDK 原生接入层，包括 mobile binding、Android/iOS 原生库、RN native module 和 TS façade。
- `react-native-auth-session`: RN 端账号登录、JWT 会话维护、启动鉴权、当前用户和退出登录能力。
- `react-native-qa-workspace`: RN 端问答工作台，包括会话、流式问答、阶段状态、取消生成、知识依据和推荐问题。
- `react-native-favorites`: RN 端收藏列表/详情、回答收藏/取消收藏和会话回跳。

### Modified Capabilities

- 无。

## Impact

- 新增代码：`apps/mobile` 或 `apps/react-native` RN 应用目录，具体目录名在设计阶段确认。
- 受影响配置：`pnpm-workspace.yaml`、根 `package.json`、`turbo.json`、TypeScript / Metro / RN 构建配置。
- 受影响 Rust 层：新增 `rust-sdk/bindings/mobile`，产出 Android `.so` 和 iOS `.xcframework`。
- 受影响共享层：新增 RN 原生模块 TS façade，但不破坏 Web wasm-sdk 和小程序 SDK。
- 后端接口依赖：继续使用 `/api/auth/**`、`/api/client/qa/**`、`/api/client/favorites/**`、`/api/client/messages/**`。
- 运行工具依赖：Node、pnpm、React Native CLI 或 Expo 工具链、Android Studio / Xcode 模拟器环境。
