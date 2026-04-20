/// 平台模块后续用于封装平台无关的适配契约。
pub fn module_status() -> &'static str {
    oil_qa_core::workspace_status()
}
