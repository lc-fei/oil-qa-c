# oil-qa-c mobile

React Native/Expo 移动端客户端。该端不复刻 Web 业务逻辑，统一通过 `OilQaSdk.invoke(method, payloadJson)` 调用 Rust SDK mobile binding。

## 启动

```bash
pnpm i
pnpm dev:mobile
```

常用命令：

```bash
pnpm --filter @oil-qa-c/mobile start
pnpm --filter @oil-qa-c/mobile android
pnpm --filter @oil-qa-c/mobile ios
pnpm check:mobile
```

## Rust SDK 编译

Android Rust 产物：

```bash
pnpm build:mobile:android-rust
```

脚本会编译 `rust-sdk/bindings/mobile`，目标产物为各 ABI 的 `liboil_qa_mobile.so`。后续真机联调时，将 `.so` 放入 `apps/mobile/modules/oil-qa-sdk/android/src/main/jniLibs/<abi>/`。

iOS Rust 产物：

```bash
pnpm build:mobile:ios-rust
```

脚本会编译 iOS device/simulator targets，并在完整 Xcode 环境下通过 `xcodebuild -create-xcframework` 生成：

```text
rust-sdk/bindings/mobile/dist/ios/OilQaSdk.xcframework
```

如果只安装了 Xcode Command Line Tools，Rust `.a` 可以生成，但 `OilQaSdk.xcframework` 无法创建。需要安装完整 Xcode 并执行：

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
pnpm build:mobile:ios-rust
```

iOS RN native module 通过 `apps/mobile/modules/oil-qa-sdk/OilQaSdk.podspec` 链接该 xcframework。

## SDK 边界

移动端 JS 只调用：

```ts
mobileSdk.invoke(method, payload)
```

链路为：

`RN Screen -> mobileSdk TS façade -> NativeModules.OilQaSdk.invoke -> Rust mobile binding -> Rust SDK core`

事件链路为：

`Rust SDK event -> Android/iOS native emitter -> RN NativeEventEmitter -> mobileSdk.subscribeSdkEvent`

## 当前状态

当前提交完成移动端工程骨架、页面骨架、Rust mobile binding、Android JNI 导出和 iOS C ABI 调用占位。业务数据仍使用 mock 返回，下一阶段需要将 Rust core 内部 method registry 与真实网络/storage 接通。

登录态当前由移动端 SDK façade 统一写入 `AsyncStorage`，用于 iOS first 阶段验证启动恢复；后续真实 Rust method registry 接入后，应把 token/storage 状态机继续下沉到 Rust SDK。

## 联调风险

- Android 需要本机安装 NDK，并把 `.so` 放到对应 ABI 的 `jniLibs`。
- iOS 需要完成 `OilQaSdk.xcframework` 组装和 Xcode 工程链接。
- 模拟器访问本机服务时 Android 通常使用 `10.0.2.2`，iOS Simulator 可使用 `localhost`。
- SSE 真正接入后，流式事件必须由 Rust SDK 归并状态，再通过 native event 推送 RN。
