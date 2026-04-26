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
      // 会话列表只承载侧边栏摘要，消息正文通过 detail 接口按需获取。
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
      // 新建会话后 SDK 会立即同步当前会话，Web 层不直接改侧边栏状态。
      return client.post<{ title?: string }, Pick<QaSessionSummary, 'sessionId' | 'sessionNo' | 'title'>>(
        '/api/client/qa/sessions',
        payload,
      );
    },
    detail(sessionId: number) {
      // 会话详情是切换会话时的消息源数据，SDK 负责转换为会话和消息领域状态。
      return client.get<QaSessionDetail>(`/api/client/qa/sessions/${sessionId}`);
    },
    updateTitle(sessionId: number, payload: { title: string }) {
      // 重命名接口只提交标题，成功后的本地列表更新在 SDK 内完成。
      return client.put(`/api/client/qa/sessions/${sessionId}`, payload);
    },
    remove(sessionId: number) {
      // 删除后由 SDK 决定是否切换到下一条会话或进入空会话状态。
      return client.delete(`/api/client/qa/sessions/${sessionId}`);
    },
  };
}
