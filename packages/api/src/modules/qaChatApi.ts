import type { EvidenceDetail, RecommendationItem, SendQuestionPayload, SendQuestionResponse } from '@oil-qa-c/shared';
import type { ApiClient } from '../client';

export function createQaChatApi(client: ApiClient) {
  return {
    sendQuestion(payload: SendQuestionPayload) {
      return client.post<SendQuestionPayload, SendQuestionResponse>('/api/client/qa/chat', payload);
    },
    getEvidence(messageId: number) {
      return client.get<EvidenceDetail>(`/api/client/qa/messages/${messageId}/evidence`);
    },
    getRecommendations() {
      return client.get<{ list: RecommendationItem[] }>('/api/client/qa/recommendations');
    },
  };
}
