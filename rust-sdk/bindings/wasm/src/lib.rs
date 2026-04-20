use serde::{Deserialize, Serialize};
use serde_wasm_bindgen::{from_value, to_value};
use wasm_bindgen::prelude::*;

/// 统一消息生命周期状态，保持和前端领域状态枚举一致。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
enum MessageLifecycleStatus {
    Idle,
    Streaming,
    Success,
    Failed,
    Interrupted,
}

/// 统一领域事件结构，保证不同客户端消费的是相同语义。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DomainEvent {
    #[serde(rename = "type")]
    event_type: String,
    occurred_at: String,
    payload: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CurrentUser {
    user_id: u64,
    username: String,
    account: String,
    nickname: Option<String>,
    roles: Vec<String>,
    status: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AuthDomainState {
    token: Option<String>,
    current_user: Option<CurrentUser>,
    status: String,
    last_event: Option<DomainEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct QaMessage {
    message_id: u64,
    message_no: String,
    request_no: String,
    question: String,
    answer: String,
    answer_summary: String,
    status: String,
    created_at: String,
    finished_at: Option<String>,
    favorite: bool,
    feedback_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MessageChunk {
    message_id: u64,
    request_no: String,
    delta: String,
    done: bool,
    sequence: u32,
    error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct QaSessionSummary {
    session_id: u64,
    session_no: String,
    title: String,
    last_question: String,
    message_count: usize,
    updated_at: String,
    is_favorite: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct QaSessionDetail {
    session_id: u64,
    session_no: String,
    title: String,
    messages: Vec<QaMessage>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionDomainState {
    current_session_id: Option<u64>,
    ordered_session_ids: Vec<u64>,
    empty_session: bool,
    last_event: Option<DomainEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChatDomainState {
    active_message_id: Option<u64>,
    status: MessageLifecycleStatus,
    message_ids: Vec<u64>,
    stream_buffer: std::collections::BTreeMap<u64, String>,
    last_event: Option<DomainEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MessageChunkApplyResult {
    next_state: ChatDomainState,
    next_answer: String,
}

fn build_event(event_type: &str, payload: serde_json::Value) -> DomainEvent {
    DomainEvent {
        event_type: event_type.to_string(),
        occurred_at: js_sys::Date::new_0().to_iso_string().into(),
        payload,
    }
}

fn js_error(message: impl Into<String>) -> JsValue {
    JsValue::from_str(&message.into())
}

/// Web 端初始化入口，用于确认真实 wasm 产物已经被前端加载。
#[wasm_bindgen]
pub fn sdk_status() -> String {
    oil_qa_core::workspace_status().to_string()
}

/// 会话标题生成真正由 Rust 输出，前端不再保留同名 TS 规则实现。
#[wasm_bindgen]
pub fn generate_session_title(question: &str) -> String {
    let trimmed = question.trim();

    if trimmed.is_empty() {
        "新对话".to_string()
    } else {
        trimmed.chars().take(20).collect()
    }
}

/// 认证领域状态统一由 Rust 生成，客户端只负责请求传输和持有快照。
#[wasm_bindgen]
pub fn create_authenticated_state(token: String, current_user: JsValue) -> Result<JsValue, JsValue> {
    let current_user: CurrentUser =
        from_value(current_user).map_err(|error| js_error(format!("currentUser 解析失败: {error}")))?;

    to_value(&AuthDomainState {
        token: Some(token),
        current_user: Some(current_user.clone()),
        status: "AUTHENTICATED".to_string(),
        last_event: Some(build_event(
            "AuthLoggedIn",
            serde_json::json!({
                "userId": current_user.user_id,
                "username": current_user.username,
            }),
        )),
    })
    .map_err(|error| js_error(format!("认证状态序列化失败: {error}")))
}

#[wasm_bindgen]
pub fn create_anonymous_auth_state() -> Result<JsValue, JsValue> {
    to_value(&AuthDomainState {
        token: None,
        current_user: None,
        status: "ANONYMOUS".to_string(),
        last_event: Some(build_event(
            "AuthLoggedOut",
            serde_json::json!({
                "reason": "manual-or-empty-token",
            }),
        )),
    })
    .map_err(|error| js_error(format!("匿名认证状态序列化失败: {error}")))
}

#[wasm_bindgen]
pub fn create_expired_auth_state() -> Result<JsValue, JsValue> {
    to_value(&AuthDomainState {
        token: None,
        current_user: None,
        status: "EXPIRED".to_string(),
        last_event: Some(build_event(
            "AuthExpired",
            serde_json::json!({
                "reason": "token-invalid-or-me-failed",
            }),
        )),
    })
    .map_err(|error| js_error(format!("过期认证状态序列化失败: {error}")))
}

#[wasm_bindgen]
pub fn create_session_domain_state(sessions: JsValue, current_session_id: JsValue) -> Result<JsValue, JsValue> {
    let sessions: Vec<QaSessionSummary> =
        from_value(sessions).map_err(|error| js_error(format!("sessions 解析失败: {error}")))?;
    let current_session_id = if current_session_id.is_null() || current_session_id.is_undefined() {
        None
    } else {
        current_session_id.as_f64().map(|value| value as u64)
    };

    to_value(&SessionDomainState {
        current_session_id,
        ordered_session_ids: sessions.iter().map(|session| session.session_id).collect(),
        empty_session: sessions.is_empty(),
        last_event: Some(build_event(
            "SessionSwitched",
            serde_json::json!({
                "currentSessionId": current_session_id,
                "sessionCount": sessions.len(),
            }),
        )),
    })
    .map_err(|error| js_error(format!("会话领域状态序列化失败: {error}")))
}

#[wasm_bindgen]
pub fn create_chat_domain_state(messages: JsValue) -> Result<JsValue, JsValue> {
    let messages: Vec<QaMessage> =
        from_value(messages).map_err(|error| js_error(format!("messages 解析失败: {error}")))?;
    let active_message = messages.iter().rev().find(|message| message.status == "PROCESSING");

    let stream_buffer = messages
        .iter()
        .map(|message| (message.message_id, message.answer.clone()))
        .collect::<std::collections::BTreeMap<_, _>>();

    to_value(&ChatDomainState {
        active_message_id: active_message.map(|message| message.message_id),
        status: if active_message.is_some() {
            MessageLifecycleStatus::Streaming
        } else {
            MessageLifecycleStatus::Idle
        },
        message_ids: messages.iter().map(|message| message.message_id).collect(),
        stream_buffer,
        last_event: Some(build_event(
            if active_message.is_some() {
                "MessageSubmitted"
            } else {
                "MessageCompleted"
            },
            serde_json::json!({
                "activeMessageId": active_message.map(|message| message.message_id),
                "messageCount": messages.len(),
            }),
        )),
    })
    .map_err(|error| js_error(format!("消息领域状态序列化失败: {error}")))
}

#[wasm_bindgen]
pub fn apply_message_chunk(state: JsValue, chunk: JsValue) -> Result<JsValue, JsValue> {
    let state: ChatDomainState =
        from_value(state).map_err(|error| js_error(format!("chatState 解析失败: {error}")))?;
    let chunk: MessageChunk =
        from_value(chunk).map_err(|error| js_error(format!("messageChunk 解析失败: {error}")))?;

    let previous_text = state
        .stream_buffer
        .get(&chunk.message_id)
        .cloned()
        .unwrap_or_default();
    let next_answer = format!("{previous_text}{}", chunk.delta);
    let next_status = if chunk.error_message.is_some() {
        MessageLifecycleStatus::Failed
    } else if chunk.done {
        MessageLifecycleStatus::Success
    } else {
        MessageLifecycleStatus::Streaming
    };

    let mut next_message_ids = state.message_ids.clone();
    if !next_message_ids.contains(&chunk.message_id) {
        next_message_ids.push(chunk.message_id);
    }

    let mut next_stream_buffer = state.stream_buffer.clone();
    next_stream_buffer.insert(chunk.message_id, next_answer.clone());

    to_value(&MessageChunkApplyResult {
        next_state: ChatDomainState {
          active_message_id: if chunk.done { None } else { Some(chunk.message_id) },
          status: next_status,
          message_ids: next_message_ids,
          stream_buffer: next_stream_buffer,
          last_event: Some(build_event(
              if chunk.error_message.is_some() {
                  "MessageFailed"
              } else if chunk.done {
                  "MessageCompleted"
              } else {
                  "MessageChunkReceived"
              },
              serde_json::json!({
                  "messageId": chunk.message_id,
                  "requestNo": chunk.request_no,
                  "sequence": chunk.sequence,
              }),
          )),
        },
        next_answer,
    })
    .map_err(|error| js_error(format!("chunk 应用结果序列化失败: {error}")))
}

#[wasm_bindgen]
pub fn sync_domain_states_from_session(detail: JsValue) -> Result<JsValue, JsValue> {
    let detail: QaSessionDetail =
        from_value(detail).map_err(|error| js_error(format!("sessionDetail 解析失败: {error}")))?;
    let last_message = detail.messages.last();

    let session_state = SessionDomainState {
        current_session_id: Some(detail.session_id),
        ordered_session_ids: vec![detail.session_id],
        empty_session: detail.messages.is_empty(),
        last_event: Some(build_event(
            "SessionSwitched",
            serde_json::json!({
                "currentSessionId": detail.session_id,
                "sessionCount": 1,
            }),
        )),
    };

    let active_message = detail
        .messages
        .iter()
        .rev()
        .find(|message| message.status == "PROCESSING");
    let chat_state = ChatDomainState {
        active_message_id: active_message.map(|message| message.message_id),
        status: if active_message.is_some() {
            MessageLifecycleStatus::Streaming
        } else {
            MessageLifecycleStatus::Idle
        },
        message_ids: detail.messages.iter().map(|message| message.message_id).collect(),
        stream_buffer: detail
            .messages
            .iter()
            .map(|message| (message.message_id, message.answer.clone()))
            .collect(),
        last_event: Some(build_event(
            if active_message.is_some() {
                "MessageSubmitted"
            } else {
                "MessageCompleted"
            },
            serde_json::json!({
                "activeMessageId": active_message.map(|message| message.message_id),
                "messageCount": detail.messages.len(),
                "lastQuestion": last_message.map(|message| message.question.clone()).unwrap_or_default(),
            }),
        )),
    };

    to_value(&serde_json::json!({
        "sessionState": session_state,
        "chatState": chat_state,
    }))
    .map_err(|error| js_error(format!("session 同步结果序列化失败: {error}")))
}
