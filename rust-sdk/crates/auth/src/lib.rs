/// 认证领域状态，用于统一多端登录态快照语义。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AuthStatus {
    Anonymous,
    Authenticated,
    Expired,
}

/// 认证模块当前先建立领域状态骨架，后续再补 token 解析与状态机细节。
pub fn module_status() -> &'static str {
    oil_qa_core::workspace_status()
}
