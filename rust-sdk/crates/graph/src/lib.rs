/// 图谱节点模型，后续供 evidence 和缩略图视图统一消费。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GraphNode {
    pub id: String,
    pub name: String,
    pub node_type: String,
}

/// 图谱边模型，统一跨端关系表达。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct GraphEdge {
    pub source: String,
    pub relation_type: String,
    pub target: String,
}

/// 图谱模块后续负责节点边模型和 evidence 数据整理。
pub fn module_status() -> &'static str {
    oil_qa_core::workspace_status()
}
