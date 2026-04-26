import type {
  AdminPaginatedResult,
  MonitorAiCallDetail,
  MonitorGraphRetrievalDetail,
  MonitorNlpDetail,
  MonitorOverview,
  MonitorOverviewQuery,
  MonitorPerformanceQuery,
  MonitorPerformanceStatistics,
  MonitorPromptDetail,
  MonitorPromptDetailQuery,
  MonitorRequestDetail,
  MonitorRequestQuery,
  MonitorRequestSummary,
  MonitorTimingDetail,
  MonitorTopQuestionItem,
  MonitorTopQuestionQuery,
  MonitorTrendItem,
  MonitorTrendQuery,
} from '@oil-qa-c/shared';
import type { ApiClient } from '../client';

function appendQuery(path: string, query: object = {}) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    // 接口文档中 0/1 是有效筛选值，不能用 truthy 判断丢掉。
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export function createMonitorApi(client: ApiClient) {
  return {
    overview(query: MonitorOverviewQuery = {}) {
      // 运行总览用于监控页顶部看板，后端负责按时间范围聚合。
      return client.get<MonitorOverview>(appendQuery('/api/admin/monitor/overview', query));
    },
    listRequests(query: MonitorRequestQuery = {}) {
      // 请求列表只返回链路摘要，详情和阶段数据按 requestId 再懒加载。
      return client.get<AdminPaginatedResult<MonitorRequestSummary>>(
        appendQuery('/api/admin/monitor/requests', query),
      );
    },
    requestDetail(requestId: string) {
      return client.get<MonitorRequestDetail>(`/api/admin/monitor/requests/${requestId}`);
    },
    nlpDetail(requestId: string) {
      return client.get<MonitorNlpDetail>(`/api/admin/monitor/requests/${requestId}/nlp`);
    },
    graphRetrievalDetail(requestId: string) {
      return client.get<MonitorGraphRetrievalDetail>(
        `/api/admin/monitor/requests/${requestId}/graph-retrieval`,
      );
    },
    promptDetail(query: MonitorPromptDetailQuery) {
      const { requestId, ...restQuery } = query;
      return client.get<MonitorPromptDetail>(
        appendQuery(`/api/admin/monitor/requests/${requestId}/prompt`, restQuery),
      );
    },
    aiCallDetail(requestId: string) {
      return client.get<MonitorAiCallDetail>(`/api/admin/monitor/requests/${requestId}/ai-call`);
    },
    timings(requestId: string) {
      return client.get<MonitorTimingDetail>(`/api/admin/monitor/requests/${requestId}/timings`);
    },
    trend(query: MonitorTrendQuery) {
      return client.get<MonitorTrendItem[]>(appendQuery('/api/admin/monitor/statistics/trend', query));
    },
    topQuestions(query: MonitorTopQuestionQuery = {}) {
      return client.get<MonitorTopQuestionItem[]>(
        appendQuery('/api/admin/monitor/statistics/top-questions', query),
      );
    },
    performance(query: MonitorPerformanceQuery = {}) {
      return client.get<MonitorPerformanceStatistics>(
        appendQuery('/api/admin/monitor/statistics/performance', query),
      );
    },
  };
}
