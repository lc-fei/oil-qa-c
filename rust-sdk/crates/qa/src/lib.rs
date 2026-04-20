/// 问答域消息状态，后续用于统一流式消息状态机。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MessageLifecycleStatus {
    Idle,
    Streaming,
    Success,
    Failed,
    Interrupted,
}

/// 会话领域快照，客户端后续可基于此映射自己的 UI 状态。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SessionDomainState {
    pub current_session_id: Option<u64>,
    pub ordered_session_ids: Vec<u64>,
    pub empty_session: bool,
}

/// 消息领域快照，后续流式响应和历史恢复都围绕这份状态推进。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ChatDomainState {
    pub active_message_id: Option<u64>,
    pub status: MessageLifecycleStatus,
    pub message_ids: Vec<u64>,
}

/// 按当前设计，问答域模块负责标准化请求、回答和状态机等跨端能力。
pub fn module_status() -> &'static str {
    oil_qa_core::workspace_status()
}
