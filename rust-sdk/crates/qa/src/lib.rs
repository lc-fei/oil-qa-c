use std::cell::RefCell;
use std::collections::BTreeMap;

use oil_qa_core::SdkResult;
use oil_qa_platform::invoke_transport;
use serde::{Deserialize, Serialize};

thread_local! {
    static SESSION_LIST_CACHE: RefCell<Vec<QaSessionSummary>> = const { RefCell::new(Vec::new()) };
    static SESSION_STATE_CACHE: RefCell<Option<SessionDomainState>> = const { RefCell::new(None) };
    static CHAT_STATE_CACHE: RefCell<Option<ChatDomainState>> = const { RefCell::new(None) };
    static CURRENT_DETAIL_CACHE: RefCell<Option<QaSessionDetail>> = const { RefCell::new(None) };
}

/// 问答域消息状态，后续用于统一流式消息状态机。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MessageLifecycleStatus {
    Idle,
    Streaming,
    Success,
    Failed,
    Interrupted,
}

/// 会话领域事件结构由 SDK 统一给出，避免前端自行拼装事件语义。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DomainEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub occurred_at: String,
    pub payload: serde_json::Value,
}

/// 会话列表模型由 SDK 统一定义，作为多端共享的最小会话摘要。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QaSessionSummary {
    pub session_id: u64,
    pub session_no: String,
    pub title: String,
    pub last_question: String,
    pub message_count: usize,
    pub updated_at: String,
    pub is_favorite: bool,
}

/// 历史消息结构用于构建会话详情和消息状态机。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QaMessage {
    pub message_id: u64,
    pub message_no: String,
    pub request_no: String,
    pub question: String,
    pub answer: String,
    pub answer_summary: String,
    pub status: String,
    pub created_at: String,
    pub finished_at: Option<String>,
    pub favorite: bool,
    pub feedback_type: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendQuestionPayload {
    pub session_id: Option<u64>,
    pub question: String,
    pub context_mode: Option<String>,
    pub answer_mode: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatTimings {
    pub total_duration_ms: i64,
    pub nlp_duration_ms: i64,
    pub graph_duration_ms: i64,
    pub prompt_duration_ms: i64,
    pub ai_duration_ms: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceSummary {
    pub graph_hit: bool,
    pub entity_count: usize,
    pub relation_count: usize,
    pub confidence: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendQuestionResponse {
    pub session_id: u64,
    pub session_no: String,
    pub message_id: u64,
    pub message_no: String,
    pub request_no: String,
    pub question: String,
    pub answer: String,
    pub answer_summary: String,
    pub follow_ups: Vec<String>,
    pub status: String,
    pub timings: ChatTimings,
    pub evidence_summary: EvidenceSummary,
}

/// 会话详情由客户端网络层获取后，交给 SDK 统一同步领域状态。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QaSessionDetail {
    pub session_id: u64,
    pub session_no: String,
    pub title: String,
    pub messages: Vec<QaMessage>,
}

/// 流式 chunk 结构由 SDK 统一定义，便于后续 Web / Android / Flutter 复用同一状态机。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageChunk {
    pub message_id: u64,
    pub request_no: String,
    pub delta: String,
    pub done: bool,
    pub sequence: u32,
    pub error_message: Option<String>,
}

/// 会话领域快照只描述当前选中会话、排序结果和空态，不包含 UI 细节。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionDomainState {
    pub current_session_id: Option<u64>,
    pub ordered_session_ids: Vec<u64>,
    pub empty_session: bool,
    pub last_event: Option<DomainEvent>,
}

/// 消息领域快照由 SDK 统一推进，客户端只负责映射到 UI。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatDomainState {
    pub active_message_id: Option<u64>,
    pub status: MessageLifecycleStatus,
    pub message_ids: Vec<u64>,
    pub stream_buffer: BTreeMap<u64, String>,
    pub last_event: Option<DomainEvent>,
}

/// chunk 应用结果同时返回最新领域状态和当前拼接后的回答文本。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageChunkApplyResult {
    pub next_state: ChatDomainState,
    pub next_answer: String,
}

/// 同步会话详情后的双状态结果，便于客户端一次性更新会话和消息域。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncedDomainStates {
    pub session_state: SessionDomainState,
    pub chat_state: ChatDomainState,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecommendationItem {
    pub id: u64,
    pub question_text: String,
    pub question_type: String,
    pub sort_no: i32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaginatedResult<T> {
    pub total: usize,
    pub list: Vec<T>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionListQuery {
    pub keyword: Option<String>,
    pub page_num: Option<u32>,
    pub page_size: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSessionPayload {
    pub title: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RenameSessionPayload {
    pub session_id: u64,
    pub title: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionCreateResult {
    pub session_id: u64,
    pub session_no: String,
    pub title: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionSdkResult {
    pub sessions: Vec<QaSessionSummary>,
    pub session_state: SessionDomainState,
    pub current_detail: Option<QaSessionDetail>,
    pub chat_state: ChatDomainState,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecommendationListResult {
    pub list: Vec<RecommendationItem>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceEntity {
    pub entity_id: String,
    pub entity_name: String,
    pub entity_type: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceRelation {
    pub source_name: String,
    pub relation_type: String,
    pub target_name: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceSource {
    pub source_type: String,
    pub title: String,
    pub content: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceGraphNode {
    pub node_id: String,
    pub node_name: String,
    pub node_type: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceGraphEdge {
    pub source_id: String,
    pub target_id: String,
    pub relation_type: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceGraphData {
    pub center: Option<EvidenceEntity>,
    pub nodes: Vec<EvidenceGraphNode>,
    pub edges: Vec<EvidenceGraphEdge>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EvidenceDetail {
    pub message_id: u64,
    pub request_no: String,
    pub entities: Vec<EvidenceEntity>,
    pub relations: Vec<EvidenceRelation>,
    pub graph_data: EvidenceGraphData,
    pub sources: Vec<EvidenceSource>,
    pub timings: ChatTimings,
    pub confidence: f64,
}

fn build_event(event_type: &str, payload: serde_json::Value) -> DomainEvent {
    DomainEvent {
        event_type: event_type.to_string(),
        occurred_at: js_sys::Date::new_0().to_iso_string().into(),
        payload,
    }
}

fn set_session_sdk_result(result: SessionSdkResult) -> SessionSdkResult {
    SESSION_LIST_CACHE.with(|cache| {
        cache.replace(result.sessions.clone());
    });
    SESSION_STATE_CACHE.with(|cache| {
        cache.replace(Some(result.session_state.clone()));
    });
    CHAT_STATE_CACHE.with(|cache| {
        cache.replace(Some(result.chat_state.clone()));
    });
    CURRENT_DETAIL_CACHE.with(|cache| {
        cache.replace(result.current_detail.clone());
    });
    result
}

fn cached_sessions() -> Vec<QaSessionSummary> {
    SESSION_LIST_CACHE.with(|cache| cache.borrow().clone())
}

pub fn get_session_snapshot() -> SessionSdkResult {
    let sessions = cached_sessions();
    let session_state = SESSION_STATE_CACHE
        .with(|cache| cache.borrow().clone())
        .unwrap_or_else(|| create_session_domain_state(&sessions, None, "SessionSwitched"));
    let chat_state = CHAT_STATE_CACHE
        .with(|cache| cache.borrow().clone())
        .unwrap_or_else(|| create_chat_domain_state(&[], "MessageCompleted"));
    let current_detail = CURRENT_DETAIL_CACHE.with(|cache| cache.borrow().clone());

    SessionSdkResult {
        sessions,
        session_state,
        current_detail,
        chat_state,
    }
}

fn create_summary_from_detail(detail: &QaSessionDetail, previous_summary: Option<&QaSessionSummary>) -> QaSessionSummary {
    let last_message = detail.messages.last();

    QaSessionSummary {
        session_id: detail.session_id,
        session_no: detail.session_no.clone(),
        title: detail.title.clone(),
        last_question: last_message
            .map(|message| message.question.clone())
            .or_else(|| previous_summary.map(|summary| summary.last_question.clone()))
            .unwrap_or_default(),
        message_count: detail.messages.len(),
        updated_at: last_message
            .map(|message| message.created_at.clone())
            .or_else(|| previous_summary.map(|summary| summary.updated_at.clone()))
            .unwrap_or_else(|| js_sys::Date::new_0().to_iso_string().into()),
        is_favorite: previous_summary
            .map(|summary| summary.is_favorite)
            .unwrap_or_else(|| detail.messages.iter().any(|message| message.favorite)),
    }
}

fn create_message_from_chat_response(response: &SendQuestionResponse) -> QaMessage {
    QaMessage {
        message_id: response.message_id,
        message_no: response.message_no.clone(),
        request_no: response.request_no.clone(),
        question: response.question.clone(),
        answer: response.answer.clone(),
        answer_summary: response.answer_summary.clone(),
        status: response.status.clone(),
        // 发送问题接口按文档不返回消息时间与交互字段，这里由 SDK 统一补齐初始消息快照。
        created_at: js_sys::Date::new_0().to_iso_string().into(),
        finished_at: Some(js_sys::Date::new_0().to_iso_string().into()),
        favorite: false,
        feedback_type: None,
    }
}

fn build_sdk_result(sessions: Vec<QaSessionSummary>, current_detail: Option<QaSessionDetail>) -> SessionSdkResult {
    let current_session_id = current_detail.as_ref().map(|detail| detail.session_id);
    let synced_chat_state = current_detail
        .as_ref()
        .map(|detail| sync_domain_states_from_session(detail).chat_state)
        .unwrap_or_else(|| create_chat_domain_state(&[], "MessageCompleted"));

    SessionSdkResult {
        session_state: create_session_domain_state(&sessions, current_session_id, "SessionSwitched"),
        chat_state: synced_chat_state,
        sessions,
        current_detail,
    }
}

/// 会话标题生成是第一阶段必须沉淀到 SDK 的稳定规则。
pub fn generate_session_title(question: &str) -> String {
    let trimmed = question.trim();

    if trimmed.is_empty() {
        "新对话".to_string()
    } else {
        trimmed.chars().take(20).collect()
    }
}

/// 列表级会话状态统一由 SDK 推导，客户端不再重复维护排序与空态规则。
pub fn create_session_domain_state(
    sessions: &[QaSessionSummary],
    current_session_id: Option<u64>,
    event_type: &str,
) -> SessionDomainState {
    SessionDomainState {
        current_session_id,
        ordered_session_ids: sessions.iter().map(|session| session.session_id).collect(),
        empty_session: sessions.is_empty(),
        last_event: Some(build_event(
            event_type,
            serde_json::json!({
                "currentSessionId": current_session_id,
                "sessionCount": sessions.len(),
            }),
        )),
    }
}

/// 历史消息列表转换为消息领域状态时，统一由 SDK 判断当前是否仍在生成。
pub fn create_chat_domain_state(messages: &[QaMessage], event_type: &str) -> ChatDomainState {
    let active_message = messages.iter().rev().find(|message| message.status == "PROCESSING");

    ChatDomainState {
        active_message_id: active_message.map(|message| message.message_id),
        status: if active_message.is_some() {
            MessageLifecycleStatus::Streaming
        } else {
            MessageLifecycleStatus::Idle
        },
        message_ids: messages.iter().map(|message| message.message_id).collect(),
        stream_buffer: messages
            .iter()
            .map(|message| (message.message_id, message.answer.clone()))
            .collect(),
        last_event: Some(build_event(
            event_type,
            serde_json::json!({
                "activeMessageId": active_message.map(|message| message.message_id),
                "messageCount": messages.len(),
            }),
        )),
    }
}

/// 会话详情恢复时，由 SDK 一次性重建会话域和消息域，避免客户端自己拼两套状态。
pub fn sync_domain_states_from_session(detail: &QaSessionDetail) -> SyncedDomainStates {
    SyncedDomainStates {
        session_state: create_session_domain_state(
            &[QaSessionSummary {
                session_id: detail.session_id,
                session_no: detail.session_no.clone(),
            title: detail.title.clone(),
            last_question: detail
                .messages
                .last()
                .map(|message| message.question.clone())
                .unwrap_or_default(),
            message_count: detail.messages.len(),
                updated_at: detail
                    .messages
                    .last()
                    .map(|message| message.created_at.clone())
                    .unwrap_or_else(|| js_sys::Date::new_0().to_iso_string().into()),
                is_favorite: detail.messages.iter().any(|message| message.favorite),
            }],
            Some(detail.session_id),
            "SessionSwitched",
        ),
        chat_state: create_chat_domain_state(&detail.messages, "MessageCompleted"),
    }
}

/// chunk 合并规则属于典型的跨端核心逻辑，应由 SDK 独立维护。
pub fn apply_message_chunk(state: &ChatDomainState, chunk: &MessageChunk) -> MessageChunkApplyResult {
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

    MessageChunkApplyResult {
        next_state: ChatDomainState {
            active_message_id: if chunk.done {
                None
            } else {
                Some(chunk.message_id)
            },
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
    }
}

/// 会话列表的拉取和初始选中逻辑统一放在 SDK，客户端只消费最终快照。
pub async fn bootstrap_sessions(query: SessionListQuery) -> SdkResult<SessionSdkResult> {
    let response: PaginatedResult<QaSessionSummary> = invoke_transport(
        "session.list",
        serde_json::to_value(query).expect("session list payload serialize"),
        None,
    )
    .await?;

    if response.list.is_empty() {
        return Ok(set_session_sdk_result(build_sdk_result(Vec::new(), None)));
    }

    let fallback_result = build_sdk_result(response.list.clone(), None);
    let current_detail = invoke_transport(
        "session.detail",
        serde_json::json!({ "sessionId": response.list[0].session_id }),
        None,
    )
    .await;

    let current_detail: QaSessionDetail = match current_detail {
        Ok(current_detail) => current_detail,
        Err(_) => {
            // 初始化阶段先保证历史会话列表可见，详情失败不应导致整侧边栏空白。
            return Ok(set_session_sdk_result(fallback_result));
        }
    };
    let next_sessions = response
        .list
        .into_iter()
        .map(|session| {
            if session.session_id == current_detail.session_id {
                create_summary_from_detail(&current_detail, Some(&session))
            } else {
                session
            }
        })
        .collect();

    Ok(set_session_sdk_result(build_sdk_result(next_sessions, Some(current_detail))))
}

pub async fn select_session(session_id: u64) -> SdkResult<SessionSdkResult> {
    let detail: QaSessionDetail = invoke_transport("session.detail", serde_json::json!({ "sessionId": session_id }), None).await?;
    let current_sessions = cached_sessions();
    let mut matched = false;
    let mut next_sessions: Vec<QaSessionSummary> = current_sessions
        .into_iter()
        .map(|session| {
            if session.session_id == session_id {
                matched = true;
                create_summary_from_detail(&detail, Some(&session))
            } else {
                session
            }
        })
        .collect();

    if !matched {
        next_sessions.insert(0, create_summary_from_detail(&detail, None));
    }

    Ok(set_session_sdk_result(build_sdk_result(next_sessions, Some(detail))))
}

pub async fn create_session(payload: CreateSessionPayload) -> SdkResult<SessionSdkResult> {
    let created: SessionCreateResult = invoke_transport(
        "session.create",
        serde_json::to_value(payload).expect("session create payload serialize"),
        None,
    )
    .await?;
    let mut next_sessions = cached_sessions();
    let detail = QaSessionDetail {
        session_id: created.session_id,
        session_no: created.session_no.clone(),
        title: if created.title.trim().is_empty() {
            "新对话".to_string()
        } else {
            created.title.clone()
        },
        messages: Vec::new(),
    };

    next_sessions.insert(
        0,
        QaSessionSummary {
            session_id: created.session_id,
            session_no: created.session_no,
            title: detail.title.clone(),
            last_question: String::new(),
            message_count: 0,
            updated_at: js_sys::Date::new_0().to_iso_string().into(),
            is_favorite: false,
        },
    );

    Ok(set_session_sdk_result(build_sdk_result(next_sessions, Some(detail))))
}

pub async fn rename_session(payload: RenameSessionPayload) -> SdkResult<SessionSdkResult> {
    let _: serde_json::Value = invoke_transport(
        "session.rename",
        serde_json::json!({
            "sessionId": payload.session_id,
            "title": payload.title,
        }),
        None,
    )
    .await?;

    let current_snapshot = get_session_snapshot();
    let next_sessions = current_snapshot
        .sessions
        .into_iter()
        .map(|session| {
            if session.session_id == payload.session_id {
                QaSessionSummary {
                    title: payload.title.clone(),
                    ..session
                }
            } else {
                session
            }
        })
        .collect::<Vec<_>>();
    let next_detail = current_snapshot.current_detail.map(|detail| {
        if detail.session_id == payload.session_id {
            QaSessionDetail {
                title: payload.title.clone(),
                ..detail
            }
        } else {
            detail
        }
    });

    Ok(set_session_sdk_result(build_sdk_result(next_sessions, next_detail)))
}

pub async fn delete_session(session_id: u64) -> SdkResult<SessionSdkResult> {
    let _: serde_json::Value = invoke_transport("session.delete", serde_json::json!({ "sessionId": session_id }), None).await?;
    let next_sessions = cached_sessions()
        .into_iter()
        .filter(|session| session.session_id != session_id)
        .collect::<Vec<_>>();

    if next_sessions.is_empty() {
        return Ok(set_session_sdk_result(build_sdk_result(Vec::new(), None)));
    }

    let fallback_session_id = next_sessions[0].session_id;
    let detail: QaSessionDetail = invoke_transport(
        "session.detail",
        serde_json::json!({ "sessionId": fallback_session_id }),
        None,
    )
    .await?;
    let merged_sessions = next_sessions
        .into_iter()
        .map(|session| {
            if session.session_id == detail.session_id {
                create_summary_from_detail(&detail, Some(&session))
            } else {
                session
            }
        })
        .collect();

    Ok(set_session_sdk_result(build_sdk_result(merged_sessions, Some(detail))))
}

/// 推荐问题也通过 SDK 统一对外暴露，避免页面层继续感知独立 HTTP 接口。
pub async fn list_recommendations() -> SdkResult<RecommendationListResult> {
    invoke_transport("recommendation.list", serde_json::json!({}), None).await
}

/// 问答发送由 SDK 统一编排，客户端只负责传入问题与消费最终会话/消息快照。
pub async fn send_question(payload: SendQuestionPayload) -> SdkResult<SessionSdkResult> {
    let response: SendQuestionResponse = invoke_transport(
        "chat.send",
        serde_json::to_value(payload).expect("chat send payload serialize"),
        None,
    )
    .await?;
    let next_message = create_message_from_chat_response(&response);
    let current_detail = CURRENT_DETAIL_CACHE.with(|cache| cache.borrow().clone());
    let existing_summary = cached_sessions()
        .into_iter()
        .find(|session| session.session_id == response.session_id);

    let next_title = existing_summary
        .as_ref()
        .map(|session| session.title.clone())
        .filter(|title| !title.trim().is_empty())
        .unwrap_or_else(|| generate_session_title(&response.question));
    let mut next_detail = if let Some(detail) = current_detail.filter(|detail| detail.session_id == response.session_id) {
        let mut messages = detail.messages;
        if let Some(message_index) = messages
            .iter()
            .position(|message| message.message_id == next_message.message_id)
        {
            messages[message_index] = next_message.clone();
        } else {
            messages.push(next_message.clone());
        }

        QaSessionDetail {
            session_id: response.session_id,
            session_no: response.session_no.clone(),
            title: detail.title,
            messages,
        }
    } else {
        QaSessionDetail {
            session_id: response.session_id,
            session_no: response.session_no.clone(),
            title: next_title.clone(),
            messages: vec![next_message.clone()],
        }
    };
    if next_detail.title.trim().is_empty() {
        next_detail.title = next_title.clone();
    }

    let mut next_sessions = cached_sessions();
    if let Some(summary_index) = next_sessions
        .iter()
        .position(|session| session.session_id == response.session_id)
    {
        next_sessions.remove(summary_index);
    }
    next_sessions.insert(0, create_summary_from_detail(&next_detail, existing_summary.as_ref()));

    Ok(set_session_sdk_result(build_sdk_result(next_sessions, Some(next_detail))))
}

/// 依据查询网关同样走 SDK，便于后续多端统一沿用同一调用语义。
pub async fn get_evidence(message_id: u64) -> SdkResult<EvidenceDetail> {
    invoke_transport("chat.evidence", serde_json::json!({ "messageId": message_id }), None).await
}

/// 问答域模块负责标准化会话、消息和状态机规则，不承担请求传输逻辑。
pub fn module_status() -> &'static str {
    oil_qa_core::workspace_status()
}
