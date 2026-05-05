## ADDED Requirements

### Requirement: 小程序账号登录
系统 SHALL 在微信小程序端提供账号密码登录能力，调用 `POST /api/auth/login`，登录成功后持久化 JWT 并进入问答首页。

#### Scenario: 登录成功
- **WHEN** 用户输入 account 和 password 并提交登录
- **THEN** 系统 MUST 调用登录接口、保存 token，并跳转到问答首页

#### Scenario: 登录失败
- **WHEN** 登录接口返回业务错误、HTTP 错误或网络异常
- **THEN** 系统 MUST 保留账号输入并展示明确错误提示

### Requirement: 启动态鉴权
系统 SHALL 在小程序启动和进入受保护页面时校验本地 token，并通过 `GET /api/auth/me` 获取当前用户。

#### Scenario: 已登录用户启动
- **WHEN** 本地存在 token 且当前用户接口返回成功
- **THEN** 系统 MUST 保持登录态并允许进入问答首页、收藏页等受保护页面

#### Scenario: 登录失效
- **WHEN** 当前用户接口返回未授权或 token 无效
- **THEN** 系统 MUST 清除本地 token 和用户信息，并跳转登录页

### Requirement: 用户菜单与退出登录
系统 SHALL 在问答首页提供用户入口，展示昵称或用户名，并支持进入我的收藏和退出登录。

#### Scenario: 退出登录
- **WHEN** 用户点击退出登录
- **THEN** 系统 MUST 调用 `POST /api/auth/logout`，清除本地登录态，并返回登录页

#### Scenario: 进入我的收藏
- **WHEN** 用户点击我的收藏
- **THEN** 系统 MUST 跳转到收藏列表页
