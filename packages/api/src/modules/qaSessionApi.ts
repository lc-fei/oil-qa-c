import type { PaginatedResult, QaSessionDetail, QaSessionSummary } from '@oil-qa-c/shared';
import type { ApiClient } from '../client';

export interface SessionListQuery {
  keyword?: string;
  pageNum?: number;
  pageSize?: number;
}

export function createQaSessionApi(client: ApiClient) {
  return {
    list(query: SessionListQuery = {}) {
      const params = new URLSearchParams();

      if (query.keyword) {
        params.set('keyword', query.keyword);
      }

      if (query.pageNum) {
        params.set('pageNum', String(query.pageNum));
      }

      if (query.pageSize) {
        params.set('pageSize', String(query.pageSize));
      }

      const queryString = params.toString();
      const url = queryString ? `/api/client/qa/sessions?${queryString}` : '/api/client/qa/sessions';
      return client.get<PaginatedResult<QaSessionSummary>>(url);
    },
    create(payload: { title?: string }) {
      return client.post<{ title?: string }, Pick<QaSessionSummary, 'sessionId' | 'sessionNo' | 'title'>>(
        '/api/client/qa/sessions',
        payload,
      );
    },
    detail(sessionId: number) {
      return client.get<QaSessionDetail>(`/api/client/qa/sessions/${sessionId}`);
    },
    updateTitle(sessionId: number, payload: { title: string }) {
      return client.put(`/api/client/qa/sessions/${sessionId}`, payload);
    },
    remove(sessionId: number) {
      return client.delete(`/api/client/qa/sessions/${sessionId}`);
    },
  };
}
