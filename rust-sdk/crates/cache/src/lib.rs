/// 缓存模块后续用于定义跨端一致的数据编解码结构。
pub fn module_status() -> &'static str {
    oil_qa_core::workspace_status()
}
