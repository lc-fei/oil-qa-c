use oil_qa_core::SdkResult;
use oil_qa_platform::invoke_transport;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FavoriteItem {
    pub favorite_id: u64,
    pub favorite_type: String,
    pub session_id: u64,
    pub message_id: u64,
    pub title: String,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FavoriteDetail {
    pub favorite_id: u64,
    pub favorite_type: String,
    pub session_id: u64,
    pub message_id: u64,
    pub title: String,
    pub question: String,
    pub answer: String,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaginatedFavoriteResult {
    pub total: usize,
    pub list: Vec<FavoriteItem>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FavoriteQuery {
    pub keyword: Option<String>,
    pub favorite_type: Option<String>,
    pub page_num: Option<u32>,
    pub page_size: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FavoriteMessageResult {
    pub favorite_id: u64,
    pub message_id: u64,
    pub favorite: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeedbackPayload {
    pub feedback_type: String,
    pub feedback_reason: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeedbackResult {
    pub message_id: u64,
    pub feedback_type: String,
}

pub async fn list_favorites(query: FavoriteQuery) -> SdkResult<PaginatedFavoriteResult> {
    // 列表接口只返回概览字段，完整回答内容由详情接口按需获取。
    invoke_transport(
        "favorite.list",
        serde_json::to_value(query).expect("favorite list payload serialize"),
        None,
    )
    .await
}

pub async fn get_favorite_detail(favorite_id: u64) -> SdkResult<FavoriteDetail> {
    // 详情接口用于 Collapse 展开场景，避免收藏页首屏一次性加载全部回答正文。
    invoke_transport(
        "favorite.detail",
        serde_json::json!({ "favoriteId": favorite_id }),
        None,
    )
    .await
}

pub async fn favorite_message(message_id: u64) -> SdkResult<FavoriteMessageResult> {
    // 收藏动作以 messageId 为入口，后端返回 favoriteId 供后续取消收藏使用。
    invoke_transport(
        "favorite.add",
        serde_json::json!({ "messageId": message_id }),
        None,
    )
    .await
}

pub async fn cancel_favorite(favorite_id: u64) -> SdkResult<serde_json::Value> {
    // 取消收藏以 favoriteId 为准，避免同一消息重复收藏时出现歧义。
    invoke_transport(
        "favorite.remove",
        serde_json::json!({ "favoriteId": favorite_id }),
        None,
    )
    .await
}

pub async fn submit_feedback(
    message_id: u64,
    payload: FeedbackPayload,
) -> SdkResult<FeedbackResult> {
    // 反馈和收藏属于消息操作，同样通过 SDK transport 统一请求语义。
    invoke_transport(
        "feedback.submit",
        serde_json::json!({
            "messageId": message_id,
            "feedbackType": payload.feedback_type,
            "feedbackReason": payload.feedback_reason,
        }),
        None,
    )
    .await
}

/// 收藏与反馈模块当前已承接收藏查询、收藏、取消收藏与反馈提交。
pub fn module_status() -> &'static str {
    oil_qa_core::workspace_status()
}
