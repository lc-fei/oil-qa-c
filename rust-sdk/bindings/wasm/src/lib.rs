use oil_qa_auth as auth;
use oil_qa_favorite as favorite;
use oil_qa_platform as platform;
use oil_qa_qa as qa;
use serde_wasm_bindgen::{from_value, to_value};
use wasm_bindgen::{JsValue, prelude::*};

#[wasm_bindgen]
pub fn register_transport(handler: js_sys::Function) {
    platform::register_transport(handler);
}

#[wasm_bindgen]
pub fn register_storage(handler: js_sys::Function) {
    platform::register_storage(handler);
}

fn js_error(message: impl Into<String>) -> JsValue {
    JsValue::from_str(&message.into())
}

/// bindings 层只负责单一入口和参数编解码，不承载网络与领域实现。
#[wasm_bindgen]
pub async fn sdk_invoke(method: String, payload: JsValue) -> Result<JsValue, JsValue> {
    match method.as_str() {
        "system.status" => to_value(&serde_json::json!({
            "sdkStatus": oil_qa_core::workspace_status(),
            "authStatus": auth::module_status(),
            "qaStatus": qa::module_status(),
            "favoriteStatus": favorite::module_status(),
            "platformStatus": platform::module_status(),
        }))
        .map_err(|error| js_error(format!("状态序列化失败: {error}"))),
        "auth.login" => {
            let payload: auth::LoginRequest =
                from_value(payload).map_err(|error| js_error(format!("authLoginPayload 解析失败: {error}")))?;
            let state = auth::login(payload)
                .await
                .map_err(|error| js_error(format!("auth.login 调用失败: {}", error.message)))?;
            to_value(&state).map_err(|error| js_error(format!("登录结果序列化失败: {error}")))
        }
        "auth.restore_session" => {
            let state = auth::restore_session()
                .await
                .map_err(|error| js_error(format!("auth.restore_session 调用失败: {}", error.message)))?;
            to_value(&state).map_err(|error| js_error(format!("恢复登录结果序列化失败: {error}")))
        }
        "auth.logout" => {
            let state = auth::logout()
                .await
                .map_err(|error| js_error(format!("auth.logout 调用失败: {}", error.message)))?;
            to_value(&state).map_err(|error| js_error(format!("退出登录结果序列化失败: {error}")))
        }
        "auth.state.get" => to_value(&auth::get_auth_state())
            .map_err(|error| js_error(format!("认证快照序列化失败: {error}"))),
        "auth.create_authenticated_state" => {
            let payload: AuthCreateAuthenticatedPayload =
                from_value(payload).map_err(|error| js_error(format!("createAuthenticatedPayload 解析失败: {error}")))?;
            to_value(&auth::create_authenticated_state(payload.token, payload.current_user))
                .map_err(|error| js_error(format!("认证状态序列化失败: {error}")))
        }
        "auth.create_anonymous_state" => to_value(&auth::create_anonymous_state())
            .map_err(|error| js_error(format!("匿名认证状态序列化失败: {error}"))),
        "auth.create_expired_state" => to_value(&auth::create_expired_state())
            .map_err(|error| js_error(format!("过期认证状态序列化失败: {error}"))),
        "session.generate_title" => {
            let payload: SessionGenerateTitlePayload =
                from_value(payload).map_err(|error| js_error(format!("generateTitlePayload 解析失败: {error}")))?;
            to_value(&serde_json::json!({
                "title": qa::generate_session_title(&payload.question),
            }))
            .map_err(|error| js_error(format!("标题结果序列化失败: {error}")))
        }
        "session.bootstrap" => {
            let payload: SessionBootstrapPayload =
                from_value(payload).map_err(|error| js_error(format!("sessionBootstrapPayload 解析失败: {error}")))?;
            let result = qa::bootstrap_sessions(qa::SessionListQuery {
                keyword: payload.keyword,
                page_num: payload.page_num,
                page_size: payload.page_size,
            })
            .await
            .map_err(|error| js_error(format!("session.bootstrap 调用失败: {}", error.message)))?;
            to_value(&result).map_err(|error| js_error(format!("会话初始化结果序列化失败: {error}")))
        }
        "session.select" => {
            let payload: SessionSelectPayload =
                from_value(payload).map_err(|error| js_error(format!("sessionSelectPayload 解析失败: {error}")))?;
            let result = qa::select_session(payload.session_id)
                .await
                .map_err(|error| js_error(format!("session.select 调用失败: {}", error.message)))?;
            to_value(&result).map_err(|error| js_error(format!("会话切换结果序列化失败: {error}")))
        }
        "session.create" => {
            let payload: SessionCreatePayload =
                from_value(payload).map_err(|error| js_error(format!("sessionCreatePayload 解析失败: {error}")))?;
            let result = qa::create_session(qa::CreateSessionPayload { title: payload.title })
                .await
                .map_err(|error| js_error(format!("session.create 调用失败: {}", error.message)))?;
            to_value(&result).map_err(|error| js_error(format!("会话创建结果序列化失败: {error}")))
        }
        "session.rename" => {
            let payload: SessionRenamePayload =
                from_value(payload).map_err(|error| js_error(format!("sessionRenamePayload 解析失败: {error}")))?;
            let result = qa::rename_session(qa::RenameSessionPayload {
                session_id: payload.session_id,
                title: payload.title,
            })
            .await
            .map_err(|error| js_error(format!("session.rename 调用失败: {}", error.message)))?;
            to_value(&result).map_err(|error| js_error(format!("会话重命名结果序列化失败: {error}")))
        }
        "session.delete" => {
            let payload: SessionDeletePayload =
                from_value(payload).map_err(|error| js_error(format!("sessionDeletePayload 解析失败: {error}")))?;
            let result = qa::delete_session(payload.session_id)
                .await
                .map_err(|error| js_error(format!("session.delete 调用失败: {}", error.message)))?;
            to_value(&result).map_err(|error| js_error(format!("会话删除结果序列化失败: {error}")))
        }
        "chat.send" => {
            let payload: qa::SendQuestionPayload =
                from_value(payload).map_err(|error| js_error(format!("chatSendPayload 解析失败: {error}")))?;
            let result = qa::send_question(payload)
                .await
                .map_err(|error| js_error(format!("chat.send 调用失败: {}", error.message)))?;
            to_value(&result).map_err(|error| js_error(format!("问答结果序列化失败: {error}")))
        }
        "chat.evidence" => {
            let payload: ChatEvidencePayload =
                from_value(payload).map_err(|error| js_error(format!("chatEvidencePayload 解析失败: {error}")))?;
            let result = qa::get_evidence(payload.message_id)
                .await
                .map_err(|error| js_error(format!("chat.evidence 调用失败: {}", error.message)))?;
            to_value(&result).map_err(|error| js_error(format!("依据结果序列化失败: {error}")))
        }
        "session.snapshot.get" => to_value(&qa::get_session_snapshot())
            .map_err(|error| js_error(format!("会话快照序列化失败: {error}"))),
        "session.state.create" => {
            let payload: SessionStatePayload =
                from_value(payload).map_err(|error| js_error(format!("sessionStatePayload 解析失败: {error}")))?;
            to_value(&qa::create_session_domain_state(
                &payload.sessions,
                payload.current_session_id,
                "SessionSwitched",
            ))
            .map_err(|error| js_error(format!("会话状态序列化失败: {error}")))
        }
        "chat.state.create" => {
            let payload: ChatStatePayload =
                from_value(payload).map_err(|error| js_error(format!("chatStatePayload 解析失败: {error}")))?;
            to_value(&qa::create_chat_domain_state(&payload.messages, "MessageCompleted"))
                .map_err(|error| js_error(format!("消息状态序列化失败: {error}")))
        }
        "chat.chunk.apply" => {
            let payload: ApplyMessageChunkPayload =
                from_value(payload).map_err(|error| js_error(format!("messageChunkPayload 解析失败: {error}")))?;
            to_value(&qa::apply_message_chunk(&payload.state, &payload.chunk))
                .map_err(|error| js_error(format!("chunk 应用结果序列化失败: {error}")))
        }
        "session.state.sync" => {
            let payload: SyncSessionStatePayload =
                from_value(payload).map_err(|error| js_error(format!("syncSessionPayload 解析失败: {error}")))?;
            to_value(&qa::sync_domain_states_from_session(&payload.detail))
                .map_err(|error| js_error(format!("session 同步结果序列化失败: {error}")))
        }
        "recommendation.list" => {
            let result = qa::list_recommendations()
                .await
                .map_err(|error| js_error(format!("recommendation.list 调用失败: {}", error.message)))?;
            to_value(&result).map_err(|error| js_error(format!("推荐问题结果序列化失败: {error}")))
        }
        "favorite.list" => {
            let payload: FavoriteListPayload =
                from_value(payload).map_err(|error| js_error(format!("favoriteListPayload 解析失败: {error}")))?;
            let result = favorite::list_favorites(favorite::FavoriteQuery {
                keyword: payload.keyword,
                favorite_type: payload.favorite_type,
                page_num: payload.page_num,
                page_size: payload.page_size,
            })
            .await
            .map_err(|error| js_error(format!("favorite.list 调用失败: {}", error.message)))?;
            to_value(&result).map_err(|error| js_error(format!("收藏列表结果序列化失败: {error}")))
        }
        "favorite.add" => {
            let payload: FavoriteMessagePayload =
                from_value(payload).map_err(|error| js_error(format!("favoriteMessagePayload 解析失败: {error}")))?;
            let result = favorite::favorite_message(payload.message_id)
                .await
                .map_err(|error| js_error(format!("favorite.add 调用失败: {}", error.message)))?;
            to_value(&result).map_err(|error| js_error(format!("收藏结果序列化失败: {error}")))
        }
        "favorite.detail" => {
            let payload: FavoriteDetailPayload =
                from_value(payload).map_err(|error| js_error(format!("favoriteDetailPayload 解析失败: {error}")))?;
            let result = favorite::get_favorite_detail(payload.favorite_id)
                .await
                .map_err(|error| js_error(format!("favorite.detail 调用失败: {}", error.message)))?;
            to_value(&result).map_err(|error| js_error(format!("收藏详情结果序列化失败: {error}")))
        }
        "favorite.remove" => {
            let payload: FavoriteRemovePayload =
                from_value(payload).map_err(|error| js_error(format!("favoriteRemovePayload 解析失败: {error}")))?;
            let result = favorite::cancel_favorite(payload.favorite_id)
                .await
                .map_err(|error| js_error(format!("favorite.remove 调用失败: {}", error.message)))?;
            to_value(&result).map_err(|error| js_error(format!("取消收藏结果序列化失败: {error}")))
        }
        "feedback.submit" => {
            let payload: FeedbackSubmitPayload =
                from_value(payload).map_err(|error| js_error(format!("feedbackSubmitPayload 解析失败: {error}")))?;
            let result = favorite::submit_feedback(
                payload.message_id,
                favorite::FeedbackPayload {
                    feedback_type: payload.feedback_type,
                    feedback_reason: payload.feedback_reason,
                },
            )
            .await
            .map_err(|error| js_error(format!("feedback.submit 调用失败: {}", error.message)))?;
            to_value(&result).map_err(|error| js_error(format!("反馈结果序列化失败: {error}")))
        }
        _ => Err(js_error(format!("未注册的 SDK 方法: {method}"))),
    }
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct AuthCreateAuthenticatedPayload {
    token: String,
    current_user: auth::CurrentUser,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionGenerateTitlePayload {
    question: String,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionBootstrapPayload {
    keyword: Option<String>,
    page_num: Option<u32>,
    page_size: Option<u32>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionSelectPayload {
    session_id: u64,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionCreatePayload {
    title: Option<String>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionRenamePayload {
    session_id: u64,
    title: String,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionDeletePayload {
    session_id: u64,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChatEvidencePayload {
    message_id: u64,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct FavoriteListPayload {
    keyword: Option<String>,
    favorite_type: Option<String>,
    page_num: Option<u32>,
    page_size: Option<u32>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct FavoriteMessagePayload {
    message_id: u64,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct FavoriteDetailPayload {
    favorite_id: u64,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct FavoriteRemovePayload {
    favorite_id: u64,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct FeedbackSubmitPayload {
    message_id: u64,
    feedback_type: String,
    feedback_reason: Option<String>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionStatePayload {
    sessions: Vec<qa::QaSessionSummary>,
    current_session_id: Option<u64>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChatStatePayload {
    messages: Vec<qa::QaMessage>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct ApplyMessageChunkPayload {
    state: qa::ChatDomainState,
    chunk: qa::MessageChunk,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SyncSessionStatePayload {
    detail: qa::QaSessionDetail,
}
