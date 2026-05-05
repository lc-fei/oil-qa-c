## ADDED Requirements

### Requirement: 小程序端必须接入 SDK
系统 SHALL 在微信小程序端通过 SDK 接入层调用业务能力，页面、组件和 store MUST NOT 直接把 HTTP services 作为业务入口。

#### Scenario: 页面调用业务能力
- **WHEN** 小程序页面需要登录、加载会话、发送问答、查看依据、收藏或提交反馈
- **THEN** 页面 MUST 调用小程序 SDK façade 暴露的方法

#### Scenario: HTTP services 使用边界
- **WHEN** 小程序 SDK 需要访问后端接口
- **THEN** 系统 MUST 通过小程序 SDK transport 分发到 HTTP services，而不是让页面直接调用 services

### Requirement: 小程序 SDK 接入层
系统 SHALL 为微信小程序新增 SDK 接入层，包含 transport、storage 和业务 façade。

#### Scenario: SDK transport 分发
- **WHEN** SDK façade 调用 `invokeMiniProgramSdk(method, payload)`
- **THEN** SDK transport MUST 按 method 分发到认证、会话、问答、依据、收藏和反馈 services

#### Scenario: SDK storage 映射
- **WHEN** SDK 需要读取、写入或删除登录 token 与当前用户
- **THEN** SDK storage MUST 使用小程序本地存储完成持久化

### Requirement: 流式问答保持 SDK 状态入口
系统 SHALL 通过 SDK façade 创建流式本地状态、归并最终结果、处理失败和取消状态。

#### Scenario: 开始流式问答
- **WHEN** 用户提交问题
- **THEN** 页面 MUST 先调用 SDK façade 创建本地 stream 状态，再启动小程序 chunk transport

#### Scenario: 结束流式问答
- **WHEN** 后端返回 done、error 或用户取消
- **THEN** 页面 MUST 调用 SDK façade 归并成功、失败或取消状态
