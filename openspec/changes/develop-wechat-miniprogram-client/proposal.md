## Why

现有用户端已完成 PC Web 方向的产品、接口与技术文档，但还没有微信小程序端交付物。需要基于 `/Users/a123/Desktop/mds-c` 中的 C 端文档，把登录、智能问答、知识依据、收藏和反馈能力完整落到小程序端，形成可预览、可联调、可继续迭代的客户端基线。

## What Changes

- 新增微信小程序应用工程，纳入当前 monorepo，包含 `project.config.json`、`app.json`、页面、组件、样式、接口层和状态层。
- 明确微信小程序端必须接入 SDK，页面与 store 不得直接把 HTTP services 作为业务入口。
- 为小程序新增 SDK 接入层，提供小程序 transport、storage 和 SDK façade，统一承接认证、会话、问答、依据、收藏、反馈等业务方法。
- 实现账号登录、JWT 持久化、启动态鉴权、退出登录和当前用户信息展示。
- 实现问答首页的小程序适配版本：新建会话、历史会话、会话详情、提问、流式回答展示、取消生成、推荐追问、阶段状态和工具调用状态展示。
- 实现消息级知识依据查看，包含图谱命中摘要、实体、关系、证据项和工作流信息的移动端展示。
- 实现回答收藏、取消收藏、点赞/点踩反馈、收藏列表、收藏详情和回到原会话。
- 建立小程序端 API 封装、统一响应处理、错误提示、登录失效处理和基础配置管理。
- 保留 Web 端既有实现，不改变现有 PC Web 行为。

## Capabilities

### New Capabilities

- `miniprogram-auth-session`: 微信小程序端账号登录、JWT 会话管理、启动鉴权、当前用户和退出登录能力。
- `miniprogram-sdk-adapter`: 微信小程序端 SDK 接入层，包括 transport、storage、业务 façade 和页面接入约束。
- `miniprogram-qa-workspace`: 微信小程序端问答工作台，包括会话列表、会话详情、流式问答、取消生成、知识依据和推荐追问。
- `miniprogram-favorites-feedback`: 微信小程序端回答收藏、收藏列表/详情、点赞点踩反馈和从收藏回到原会话。

### Modified Capabilities

- 无。

## Impact

- 新增代码：`apps/miniprogram` 小程序应用目录。
- 受影响配置：`pnpm-workspace.yaml`、根 `package.json`、`turbo.json` 中的小程序开发、类型检查或构建脚本。
- 后端接口依赖：`/api/auth/**`、`/api/client/qa/**`、`/api/client/favorites/**`、`/api/client/messages/**`。
- 运行工具依赖：微信开发者工具或 `miniprogram-ci` 用于预览、上传和 CI 校验。
