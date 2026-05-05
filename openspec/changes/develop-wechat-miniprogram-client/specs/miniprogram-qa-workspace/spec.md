## ADDED Requirements

### Requirement: 问答首页移动端布局
系统 SHALL 在微信小程序端提供以消息流和输入栏为核心的问答首页，并将历史会话和知识依据以移动端适配方式展示。

#### Scenario: 首次进入空状态
- **WHEN** 用户登录后进入问答首页且没有当前会话消息
- **THEN** 系统 MUST 展示空状态、推荐问题入口和底部输入栏

#### Scenario: 会话态展示
- **WHEN** 当前会话存在问答消息
- **THEN** 系统 MUST 展示用户问题、系统回答、生成状态、回答操作和推荐追问

### Requirement: 会话管理
系统 SHALL 支持查询、新建、切换、重命名和删除问答会话，接口使用 `/api/client/qa/sessions` 相关端点。

#### Scenario: 加载历史会话
- **WHEN** 用户进入问答首页
- **THEN** 系统 MUST 查询会话列表，并按今天、昨天、近 7 天、更早进行展示

#### Scenario: 新建会话
- **WHEN** 用户点击新建对话
- **THEN** 系统 MUST 创建空会话或切换为空状态，下一次提问可自动绑定新会话

#### Scenario: 切换会话
- **WHEN** 用户选择历史会话
- **THEN** 系统 MUST 查询会话详情并展示该会话的消息列表

#### Scenario: 重命名或删除会话
- **WHEN** 用户提交重命名或确认删除
- **THEN** 系统 MUST 调用对应接口并刷新会话列表与当前会话状态

### Requirement: 流式问答
系统 SHALL 支持通过 `POST /api/client/qa/chat/stream` 发送问题，并消费 `start`、`stage`、`tool_call`、`chunk`、`done`、`error` SSE 事件更新页面。

#### Scenario: 正常流式生成
- **WHEN** 用户提交问题且后端返回流式事件
- **THEN** 系统 MUST 先展示用户问题，再按 chunk 增量追加回答，并在 done 后归并最终状态、followUps、timings、evidenceSummary 和 workflow

#### Scenario: 阶段和工具状态
- **WHEN** 后端返回 stage 或 tool_call 事件
- **THEN** 系统 MUST 更新当前回答的流程状态，但不得把阶段文本追加到回答正文

#### Scenario: 流式失败
- **WHEN** 后端返回 error 事件或网络异常
- **THEN** 系统 MUST 展示失败或部分成功状态，并保留已生成的可展示内容

### Requirement: 取消生成
系统 SHALL 在消息处于生成中时提供停止生成能力，并调用 `POST /api/client/qa/messages/{messageId}/cancel`。

#### Scenario: 停止生成
- **WHEN** 用户点击停止生成
- **THEN** 系统 MUST 调用取消接口，并将消息更新为 `INTERRUPTED` 或 `PARTIAL_SUCCESS`

### Requirement: 知识依据查看
系统 SHALL 支持按消息查询知识依据，调用 `GET /api/client/qa/messages/{messageId}/evidence` 并展示图谱命中、实体、关系、证据项和 workflow 明细。

#### Scenario: 查看依据
- **WHEN** 用户点击成功或部分成功回答的查看依据入口
- **THEN** 系统 MUST 加载并展示该消息的依据详情

### Requirement: 推荐问题与追问
系统 SHALL 支持加载推荐问题，并允许用户点击推荐问题或回答后的追问直接发起新问题。

#### Scenario: 点击推荐问题
- **WHEN** 用户点击推荐问题或 followUps 中的问题
- **THEN** 系统 MUST 将该问题作为输入并按当前会话上下文发起问答
