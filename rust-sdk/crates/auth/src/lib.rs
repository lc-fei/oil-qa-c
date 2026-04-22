use std::cell::RefCell;

use oil_qa_core::SdkResult;
use oil_qa_platform::{invoke_transport, storage_get, storage_remove, storage_set};
use serde::{Deserialize, Serialize};

const AUTH_TOKEN_STORAGE_KEY: &str = "authToken";

thread_local! {
    static AUTH_STATE: RefCell<AuthDomainState> = RefCell::new(create_anonymous_state());
}

/// 认证领域状态，用于统一多端登录态快照语义。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AuthStatus {
    Anonymous,
    Authenticated,
    Expired,
}

/// 统一领域事件结构，便于客户端和 SDK 共享同一套事件语义。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DomainEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub occurred_at: String,
    pub payload: serde_json::Value,
}

/// 当前用户模型由 SDK 统一定义，避免多端重复维护字段结构。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CurrentUser {
    pub user_id: u64,
    pub username: String,
    pub account: String,
    pub nickname: Option<String>,
    pub roles: Vec<String>,
    pub status: i32,
}

/// 认证领域状态只描述“用户是谁、当前是否已认证、最后一次领域事件是什么”。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthDomainState {
    pub token: Option<String>,
    pub current_user: Option<CurrentUser>,
    pub status: AuthStatus,
    pub last_event: Option<DomainEvent>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginRequest {
    pub account: String,
    pub password: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LoginResponse {
    pub token: String,
    pub user_id: u64,
    pub username: String,
    pub account: String,
    pub roles: Vec<String>,
}

fn build_event(event_type: &str, payload: serde_json::Value) -> DomainEvent {
    DomainEvent {
        event_type: event_type.to_string(),
        occurred_at: js_sys::Date::new_0().to_iso_string().into(),
        payload,
    }
}

fn set_auth_state(next_state: AuthDomainState) -> AuthDomainState {
    AUTH_STATE.with(|state| {
        state.replace(next_state.clone());
    });
    next_state
}

pub fn get_auth_state() -> AuthDomainState {
    AUTH_STATE.with(|state| state.borrow().clone())
}

/// 登录成功后的认证快照由 SDK 统一生成，客户端只负责持有和展示。
pub fn create_authenticated_state(token: String, current_user: CurrentUser) -> AuthDomainState {
    AuthDomainState {
        token: Some(token),
        current_user: Some(current_user.clone()),
        status: AuthStatus::Authenticated,
        last_event: Some(build_event(
            "AuthLoggedIn",
            serde_json::json!({
                "userId": current_user.user_id,
                "username": current_user.username,
            }),
        )),
    }
}

/// 未登录场景统一回落到匿名认证态，避免各端自己定义默认值。
pub fn create_anonymous_state() -> AuthDomainState {
    AuthDomainState {
        token: None,
        current_user: None,
        status: AuthStatus::Anonymous,
        last_event: Some(build_event(
            "AuthLoggedOut",
            serde_json::json!({
                "reason": "manual-or-empty-token",
            }),
        )),
    }
}

/// token 失效场景单独建模，方便客户端区分“主动退出”和“被动过期”。
pub fn create_expired_state() -> AuthDomainState {
    AuthDomainState {
        token: None,
        current_user: None,
        status: AuthStatus::Expired,
        last_event: Some(build_event(
            "AuthExpired",
            serde_json::json!({
                "reason": "token-invalid-or-me-failed",
            }),
        )),
    }
}

/// 登录请求由 SDK 统一编排，客户端只需要注册 transport 与 storage。
pub async fn login(payload: LoginRequest) -> SdkResult<AuthDomainState> {
    let login_result: LoginResponse = invoke_transport(
        "auth.login",
        serde_json::to_value(payload).expect("login payload serialize"),
        None,
    )
    .await?;
    storage_set(AUTH_TOKEN_STORAGE_KEY, &login_result.token).await?;

    let current_user = invoke_transport(
        "auth.current_user",
        serde_json::json!({}),
        Some(login_result.token.clone()),
    )
    .await;

    let current_user: CurrentUser = match current_user {
        Ok(current_user) => current_user,
        Err(error) => {
            storage_remove(AUTH_TOKEN_STORAGE_KEY).await?;
            return Err(error);
        }
    };

    Ok(set_auth_state(create_authenticated_state(login_result.token, current_user)))
}

/// 启动恢复时由 SDK 先读 storage，再决定是否继续调用当前用户接口。
pub async fn restore_session() -> SdkResult<AuthDomainState> {
    let token = storage_get(AUTH_TOKEN_STORAGE_KEY).await?;

    match token {
        Some(token) if !token.is_empty() => {
            match invoke_transport::<CurrentUser>("auth.current_user", serde_json::json!({}), Some(token.clone())).await {
                Ok(current_user) => Ok(set_auth_state(create_authenticated_state(token, current_user))),
                Err(_) => {
                    storage_remove(AUTH_TOKEN_STORAGE_KEY).await?;
                    Ok(set_auth_state(create_expired_state()))
                }
            }
        }
        _ => Ok(set_auth_state(create_anonymous_state())),
    }
}

/// 退出登录时仍由 SDK 负责清理 token 与认证领域状态，保持多端语义一致。
pub async fn logout() -> SdkResult<AuthDomainState> {
    let current_state = get_auth_state();
    let token = match current_state.token {
        Some(token) => Some(token),
        None => storage_get(AUTH_TOKEN_STORAGE_KEY).await?,
    };

    if let Some(token) = token {
        let _: Result<serde_json::Value, _> =
            invoke_transport("auth.logout", serde_json::json!({}), Some(token)).await;
    }

    storage_remove(AUTH_TOKEN_STORAGE_KEY).await?;
    Ok(set_auth_state(create_anonymous_state()))
}

/// 认证模块当前提供领域模型和状态推进规则，不承担网络传输逻辑。
pub fn module_status() -> &'static str {
    oil_qa_core::workspace_status()
}
