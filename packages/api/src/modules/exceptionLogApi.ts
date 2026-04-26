import type {
  AdminPaginatedResult,
  BatchExceptionHandleStatusPayload,
  BatchHandleStatusResult,
  ExceptionHandleStatusPayload,
  ExceptionLogDetail,
  ExceptionLogQuery,
  ExceptionLogSummary,
  ExceptionLogSummaryStatistics,
  MonitorPerformanceQuery,
} from '@oil-qa-c/shared';
import type { ApiClient } from '../client';

function appendQuery(path: string, query: object = {}) {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export function createExceptionLogApi(client: ApiClient) {
  return {
    list(query: ExceptionLogQuery = {}) {
      // 异常日志列表独立于监控请求列表，支撑处理状态筛选和运维闭环。
      return client.get<AdminPaginatedResult<ExceptionLogSummary>>(
        appendQuery('/api/admin/exception-logs', query),
      );
    },
    detail(exceptionId: string) {
      // 堆栈和上下文信息只在详情接口加载，避免列表泄露或传输大文本。
      return client.get<ExceptionLogDetail>(`/api/admin/exception-logs/${exceptionId}`);
    },
    summary(query: MonitorPerformanceQuery = {}) {
      return client.get<ExceptionLogSummaryStatistics>(
        appendQuery('/api/admin/exception-logs/summary', query),
      );
    },
    updateHandleStatus(exceptionId: string, payload: ExceptionHandleStatusPayload) {
      return client.put<ExceptionHandleStatusPayload, boolean>(
        `/api/admin/exception-logs/${exceptionId}/handle-status`,
        payload,
      );
    },
    batchUpdateHandleStatus(payload: BatchExceptionHandleStatusPayload) {
      return client.post<BatchExceptionHandleStatusPayload, BatchHandleStatusResult>(
        '/api/admin/exception-logs/batch-handle-status',
        payload,
      );
    },
  };
}
