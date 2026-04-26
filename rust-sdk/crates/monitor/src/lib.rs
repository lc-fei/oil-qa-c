use oil_qa_core::SdkResult;
use oil_qa_platform::invoke_transport;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[allow(non_camel_case_types)]
pub enum RequestStatus {
    SUCCESS,
    FAILED,
    PROCESSING,
    PARTIAL_SUCCESS,
    TIMEOUT,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[allow(non_camel_case_types)]
pub enum RequestSource {
    CLIENT_WEB,
    ADMIN_DEBUG,
    OPEN_API,
    SCHEDULE_TASK,
    UNKNOWN,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[allow(non_camel_case_types)]
pub enum AiCallStatus {
    SUCCESS,
    FAILED,
    TIMEOUT,
    RETRY_SUCCESS,
    RETRY_FAILED,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[allow(non_camel_case_types)]
pub enum ExceptionLevel {
    INFO,
    WARN,
    ERROR,
    FATAL,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[allow(non_camel_case_types)]
pub enum HandleStatus {
    UNHANDLED,
    HANDLING,
    HANDLED,
    IGNORED,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorOverviewQuery {
    pub range_type: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorOverview {
    pub total_qa_count: u64,
    pub success_qa_count: u64,
    pub failed_qa_count: u64,
    pub avg_response_time_ms: f64,
    pub ai_call_count: u64,
    pub graph_hit_count: u64,
    pub graph_hit_rate: f64,
    pub exception_count: u64,
    pub online_admin_user_count: u64,
    pub success_rate: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorRequestQuery {
    pub page_num: Option<u32>,
    pub page_size: Option<u32>,
    pub keyword: Option<String>,
    pub request_status: Option<RequestStatus>,
    pub request_source: Option<RequestSource>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub min_duration_ms: Option<u64>,
    pub max_duration_ms: Option<u64>,
    pub has_graph_hit: Option<u8>,
    pub has_exception: Option<u8>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorRequestSummary {
    pub request_id: String,
    pub question: String,
    pub request_time: String,
    pub request_source: RequestSource,
    pub request_status: RequestStatus,
    pub response_summary: String,
    pub total_duration_ms: u64,
    pub graph_hit: bool,
    pub ai_call_status: AiCallStatus,
    pub exception_flag: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaginatedMonitorRequestResult {
    pub total: usize,
    pub list: Vec<MonitorRequestSummary>,
    pub page_num: Option<u32>,
    pub page_size: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorRequestDetail {
    pub request_id: String,
    pub question: String,
    pub request_time: String,
    pub request_source: RequestSource,
    pub request_status: RequestStatus,
    pub total_duration_ms: u64,
    pub final_answer: String,
    pub response_summary: String,
    pub graph_hit: bool,
    pub exception_flag: bool,
    pub trace_id: String,
    pub user_id: String,
    pub user_account: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NlpDetail {
    pub request_id: String,
    pub tokenize_result: Vec<String>,
    pub keyword_list: Vec<String>,
    pub entity_list: Vec<serde_json::Value>,
    pub intent: String,
    pub confidence: f64,
    pub duration_ms: u64,
    pub raw_result: Option<serde_json::Value>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphRetrievalDetail {
    pub request_id: String,
    pub query_condition: serde_json::Value,
    pub hit_entity_list: Vec<serde_json::Value>,
    pub hit_relation_list: Vec<serde_json::Value>,
    pub hit_property_summary: Vec<String>,
    pub result_count: u64,
    pub valid_hit: bool,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptDetailQuery {
    pub request_id: String,
    pub include_full_text: Option<u8>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PromptDetail {
    pub request_id: String,
    pub original_question: String,
    pub graph_summary: String,
    pub prompt_summary: String,
    pub prompt_content: Option<String>,
    pub generated_time: String,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiCallDetail {
    pub request_id: String,
    pub model_name: String,
    pub provider: String,
    pub call_time: String,
    pub ai_call_status: AiCallStatus,
    pub response_status_code: u16,
    pub duration_ms: u64,
    pub result_summary: String,
    pub error_message: Option<String>,
    pub retry_count: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimingPhase {
    pub phase_code: String,
    pub phase_name: String,
    pub duration_ms: u64,
    pub success: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimingDetail {
    pub request_id: String,
    pub total_duration_ms: u64,
    pub phases: Vec<TimingPhase>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrendQuery {
    pub metric_type: String,
    pub granularity: Option<String>,
    pub start_date: String,
    pub end_date: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrendItem {
    pub stat_date: String,
    pub metric_value: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TopQuestionQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub top_n: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TopQuestionItem {
    pub question: String,
    pub count: u64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceQuery {
    pub start_time: Option<String>,
    pub end_time: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceStatistics {
    pub avg_response_time_ms: f64,
    pub p95_response_time_ms: f64,
    pub nlp_avg_duration_ms: f64,
    pub graph_avg_duration_ms: f64,
    pub prompt_avg_duration_ms: f64,
    pub ai_avg_duration_ms: f64,
    pub success_rate: f64,
    pub graph_hit_rate: f64,
    pub ai_failure_rate: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExceptionLogQuery {
    pub page_num: Option<u32>,
    pub page_size: Option<u32>,
    pub exception_module: Option<String>,
    pub exception_level: Option<ExceptionLevel>,
    pub handle_status: Option<HandleStatus>,
    pub keyword: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub trace_id: Option<String>,
    pub request_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExceptionLogSummary {
    pub exception_id: String,
    pub exception_module: String,
    pub exception_level: ExceptionLevel,
    pub exception_type: String,
    pub exception_message: String,
    pub request_id: Option<String>,
    pub trace_id: String,
    pub occurred_time: String,
    pub handle_status: HandleStatus,
    pub handler_name: Option<String>,
    pub handled_time: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaginatedExceptionLogResult {
    pub total: usize,
    pub list: Vec<ExceptionLogSummary>,
    pub page_num: Option<u32>,
    pub page_size: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExceptionLogDetail {
    pub exception_id: String,
    pub exception_module: String,
    pub exception_level: ExceptionLevel,
    pub exception_type: String,
    pub exception_message: String,
    pub stack_trace: String,
    pub request_id: Option<String>,
    pub trace_id: String,
    pub request_uri: String,
    pub request_method: String,
    pub request_param_summary: String,
    pub context_info: serde_json::Value,
    pub occurred_time: String,
    pub handle_status: HandleStatus,
    pub handle_remark: Option<String>,
    pub handler_id: Option<String>,
    pub handler_name: Option<String>,
    pub handled_time: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExceptionLogSummaryStatistics {
    pub total_count: u64,
    pub unhandled_count: u64,
    pub handling_count: u64,
    pub handled_count: u64,
    pub ignored_count: u64,
    pub error_count: u64,
    pub fatal_count: u64,
    pub top_module_list: Vec<ExceptionTopModuleItem>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExceptionTopModuleItem {
    pub module: String,
    pub count: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExceptionHandleStatusPayload {
    pub handle_status: HandleStatus,
    pub handle_remark: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchExceptionHandleStatusPayload {
    pub exception_ids: Vec<String>,
    pub handle_status: HandleStatus,
    pub handle_remark: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchHandleStatusResult {
    pub success_count: u64,
    pub fail_count: u64,
}

pub async fn get_monitor_overview(query: MonitorOverviewQuery) -> SdkResult<MonitorOverview> {
    // 运行总览是监控页顶部看板数据，只透传筛选条件给后端聚合接口。
    invoke_transport(
        "monitor.overview",
        serde_json::to_value(query).expect("monitor overview payload serialize"),
        None,
    )
    .await
}

pub async fn list_monitor_requests(
    query: MonitorRequestQuery,
) -> SdkResult<PaginatedMonitorRequestResult> {
    // 请求列表保持分页轻量结构，链路各阶段详情按 requestId 懒加载。
    invoke_transport(
        "monitor.requests.list",
        serde_json::to_value(query).expect("monitor requests payload serialize"),
        None,
    )
    .await
}

pub async fn get_monitor_request_detail(request_id: String) -> SdkResult<MonitorRequestDetail> {
    invoke_transport(
        "monitor.requests.detail",
        serde_json::json!({ "requestId": request_id }),
        None,
    )
    .await
}

pub async fn get_nlp_detail(request_id: String) -> SdkResult<NlpDetail> {
    invoke_transport(
        "monitor.requests.nlp",
        serde_json::json!({ "requestId": request_id }),
        None,
    )
    .await
}

pub async fn get_graph_retrieval_detail(request_id: String) -> SdkResult<GraphRetrievalDetail> {
    invoke_transport(
        "monitor.requests.graph_retrieval",
        serde_json::json!({ "requestId": request_id }),
        None,
    )
    .await
}

pub async fn get_prompt_detail(query: PromptDetailQuery) -> SdkResult<PromptDetail> {
    invoke_transport(
        "monitor.requests.prompt",
        serde_json::to_value(query).expect("monitor prompt payload serialize"),
        None,
    )
    .await
}

pub async fn get_ai_call_detail(request_id: String) -> SdkResult<AiCallDetail> {
    invoke_transport(
        "monitor.requests.ai_call",
        serde_json::json!({ "requestId": request_id }),
        None,
    )
    .await
}

pub async fn get_timing_detail(request_id: String) -> SdkResult<TimingDetail> {
    invoke_transport(
        "monitor.requests.timings",
        serde_json::json!({ "requestId": request_id }),
        None,
    )
    .await
}

pub async fn get_trend_statistics(query: TrendQuery) -> SdkResult<Vec<TrendItem>> {
    invoke_transport(
        "monitor.statistics.trend",
        serde_json::to_value(query).expect("monitor trend payload serialize"),
        None,
    )
    .await
}

pub async fn get_top_questions(query: TopQuestionQuery) -> SdkResult<Vec<TopQuestionItem>> {
    invoke_transport(
        "monitor.statistics.top_questions",
        serde_json::to_value(query).expect("monitor top questions payload serialize"),
        None,
    )
    .await
}

pub async fn get_performance_statistics(
    query: PerformanceQuery,
) -> SdkResult<PerformanceStatistics> {
    invoke_transport(
        "monitor.statistics.performance",
        serde_json::to_value(query).expect("monitor performance payload serialize"),
        None,
    )
    .await
}

pub async fn list_exception_logs(
    query: ExceptionLogQuery,
) -> SdkResult<PaginatedExceptionLogResult> {
    // 异常日志独立于运行监控路径，便于后端按处理闭环单独治理。
    invoke_transport(
        "exception_logs.list",
        serde_json::to_value(query).expect("exception logs payload serialize"),
        None,
    )
    .await
}

pub async fn get_exception_log_detail(exception_id: String) -> SdkResult<ExceptionLogDetail> {
    invoke_transport(
        "exception_logs.detail",
        serde_json::json!({ "exceptionId": exception_id }),
        None,
    )
    .await
}

pub async fn get_exception_log_summary(
    query: PerformanceQuery,
) -> SdkResult<ExceptionLogSummaryStatistics> {
    invoke_transport(
        "exception_logs.summary",
        serde_json::to_value(query).expect("exception log summary payload serialize"),
        None,
    )
    .await
}

pub async fn update_exception_handle_status(
    exception_id: String,
    payload: ExceptionHandleStatusPayload,
) -> SdkResult<bool> {
    invoke_transport(
        "exception_logs.handle_status.update",
        serde_json::json!({
            "exceptionId": exception_id,
            "handleStatus": payload.handle_status,
            "handleRemark": payload.handle_remark,
        }),
        None,
    )
    .await
}

pub async fn batch_update_exception_handle_status(
    payload: BatchExceptionHandleStatusPayload,
) -> SdkResult<BatchHandleStatusResult> {
    invoke_transport(
        "exception_logs.handle_status.batch_update",
        serde_json::to_value(payload).expect("batch exception status payload serialize"),
        None,
    )
    .await
}

/// 监控模块负责管理端运行监控和异常日志接口的跨端统一封装。
pub fn module_status() -> &'static str {
    oil_qa_core::workspace_status()
}
