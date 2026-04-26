import type { EvidenceDetail, RecommendationItem, SendQuestionPayload, SendQuestionResponse } from '@oil-qa-c/shared';
import type { ApiClient } from '../client';

export function createQaChatApi(client: ApiClient) {
  return {
    sendQuestion(payload: SendQuestionPayload) {
      // 问答发送走 SDK 统一入口；这里仅作为 Web transport 的真实 HTTP 实现。
      return client.post<SendQuestionPayload, SendQuestionResponse>('/api/client/qa/chat', payload);
    },
    getEvidence(messageId: number) {
      // 知识依据按消息懒加载，避免每条回答完成后立即拉取图谱详情。
      return client.get<EvidenceDetail>(`/api/client/qa/messages/${messageId}/evidence`);
    },
    getRecommendations() {
      // 推荐问题用于首页空状态兜底展示，业务层负责处理加载失败降级。
      return client.get<{ list: RecommendationItem[] }>('/api/client/qa/recommendations');
    },
  };
}
