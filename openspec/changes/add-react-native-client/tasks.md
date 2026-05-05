## 1. 工程骨架

- [x] 1.1 新增 `apps/mobile` Expo React Native 工程、基础入口和包配置
- [x] 1.2 将 RN 应用纳入 workspace、turbo 和根脚本管理
- [x] 1.3 配置 TypeScript、Metro/Expo、运行时环境变量和本地 baseURL
- [x] 1.4 建立移动端主题、基础布局、导航容器和页面目录结构

## 2. Rust Mobile 编译层与 RN SDK Bridge

- [x] 2.1 新增 `rust-sdk/bindings/mobile`，定义 mobile binding 和统一 `invoke(method, payloadJson)` 接口
- [x] 2.2 配置 Android Rust targets 和构建脚本，产出 `liboil_qa_mobile.so`
- [ ] 2.3 配置 iOS Rust targets 和构建脚本，产出 `OilQaSdk.xcframework`
- [x] 2.4 新增 RN Android native module，桥接 Kotlin/JNI 或 UniFFI binding 到 Rust SDK
- [x] 2.5 新增 RN iOS native module，桥接 Swift/Objective-C 或 UniFFI binding 到 Rust SDK
- [x] 2.6 新增 `apps/mobile/src/sdk` TS façade，封装 `OilQaSdk.invoke` 和 SDK event subscription
- [x] 2.7 实现 Rust SDK 流式事件到 RN JS 层的转发，覆盖 `start`、`stage`、`tool_call`、`chunk`、`done`、`error`
- [x] 2.8 实现移动端 token/storage 接入策略，确保 Rust SDK 能维护登录状态

## 3. 认证与启动态

- [x] 3.1 实现登录页 UI、账号密码输入、提交中状态和错误展示
- [x] 3.2 实现登录成功后的 token 保存、当前用户保存和导航跳转
- [x] 3.3 实现应用启动鉴权、当前用户恢复和登录失效回到登录页
- [x] 3.4 实现用户菜单、我的收藏入口和退出登录

## 4. 问答工作台

- [x] 4.1 实现聊天工作台主屏、消息列表、底部输入栏和发送按钮
- [x] 4.2 实现会话列表、会话切换、新建、重命名和删除
- [x] 4.3 实现会话详情加载和消息状态同步
- [x] 4.4 实现流式提问、回答 chunk 追加、`done` 完成归并和错误态
- [x] 4.5 实现阶段状态展示，覆盖问题理解、任务规划、知识检索、证据排序、答案生成、结果归档
- [x] 4.6 实现部分回答保留和失败提示

## 5. 知识依据与收藏

- [x] 5.1 实现知识依据详情页，展示实体、关系、来源、耗时和置信度
- [x] 5.2 实现回答收藏、取消收藏和本地收藏状态同步
- [x] 5.3 实现我的收藏列表、详情按需加载和回到原会话

## 6. 验证与交付

- [ ] 6.1 执行 Rust mobile binding 的 Android/iOS 构建检查
  - Android 已通过：`pnpm build:mobile:android-rust`、`pnpm --filter @oil-qa-c/mobile typecheck`、`./gradlew :app:assembleDebug`
  - iOS 按当前指令暂缓，未标记完成
- [x] 6.2 执行 RN app 类型检查和关键文件完整性检查
- [x] 6.3 补充 `apps/mobile/README.md`，说明启动、调试、baseURL、Android `.so` 和 iOS `.xcframework` 构建方式
- [x] 6.4 记录移动端联调风险，包括 Rust mobile 编译链、SSE、模拟器网络地址和正式测试域名
- [x] 6.5 更新 OpenSpec 任务完成状态并输出后续实施入口
