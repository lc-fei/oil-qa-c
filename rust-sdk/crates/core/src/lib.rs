/// 统一领域事件类型，作为后续多端共享语义的基础。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DomainEventKind {
    AuthLoggedIn,
    AuthLoggedOut,
    AuthExpired,
    SessionCreated,
    SessionSwitched,
    MessageSubmitted,
    MessageChunkReceived,
    MessageCompleted,
    MessageFailed,
    EvidenceLoaded,
}

/// 统一错误结构，当前先保留最小字段，后续可继续扩展错误码和上下文。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SdkError {
    pub code: String,
    pub message: String,
}

pub type SdkResult<T> = Result<T, SdkError>;

impl SdkError {
    /// 统一错误构造入口，避免各模块直接散落字符串字面量。
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
        }
    }
}

/// 返回当前 Rust workspace 的占位状态，便于上层尽早验证依赖链是否打通。
pub fn workspace_status() -> &'static str {
    "core-ready"
}
