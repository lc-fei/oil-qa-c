## ADDED Requirements

### Requirement: 回答收藏与取消收藏
系统 SHALL 支持对回答消息进行收藏和取消收藏，接口使用 `POST /api/client/messages/{messageId}/favorite` 与 `DELETE /api/client/favorites/{favoriteId}`。

#### Scenario: 收藏回答
- **WHEN** 用户点击未收藏回答的收藏按钮
- **THEN** 系统 MUST 调用收藏接口，并将该消息更新为已收藏状态

#### Scenario: 取消收藏
- **WHEN** 用户点击已收藏回答的取消收藏按钮
- **THEN** 系统 MUST 调用取消收藏接口，并将该消息更新为未收藏状态

### Requirement: 收藏列表和详情
系统 SHALL 提供我的收藏页面，支持查询收藏概览列表、分页加载和按需展开详情。

#### Scenario: 加载收藏列表
- **WHEN** 用户进入我的收藏页
- **THEN** 系统 MUST 调用 `GET /api/client/favorites` 展示收藏概览

#### Scenario: 查看收藏详情
- **WHEN** 用户展开某条收藏
- **THEN** 系统 MUST 调用 `GET /api/client/favorites/{favoriteId}` 并展示问题和完整回答

### Requirement: 从收藏回到原会话
系统 SHALL 支持从收藏项跳转回对应会话，并定位到对应回答。

#### Scenario: 回到原会话
- **WHEN** 用户点击收藏详情中的回到会话
- **THEN** 系统 MUST 跳转问答首页、加载对应 sessionId，并尽量滚动到对应 messageId

### Requirement: 回答反馈
系统 SHALL 支持对回答提交点赞或点踩反馈，接口使用 `POST /api/client/messages/{messageId}/feedback`。

#### Scenario: 提交点赞或点踩
- **WHEN** 用户点击 LIKE 或 DISLIKE
- **THEN** 系统 MUST 调用反馈接口，并更新该消息的 feedbackType

#### Scenario: 避免重复提交
- **WHEN** 用户对已反馈消息再次点击相同反馈
- **THEN** 系统 MUST 阻止重复请求或给出已反馈提示
