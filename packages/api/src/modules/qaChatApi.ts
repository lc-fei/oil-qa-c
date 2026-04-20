import type { EvidenceDetail, QaMessage, RecommendationItem } from '@oil-qa-c/shared';
import type { ApiClient } from '../client';

export interface SendQuestionPayload {
  sessionId?: number;
  question: string;
  contextMode?: 'ON' | 'OFF';
  answerMode?: 'GRAPH_ENHANCED' | 'LLM_ONLY';
}

export interface SendQuestionResponse extends QaMessage {
  sessionId: number;
  sessionNo: string;
  followUps: string[];
  timings: {
    totalDurationMs: number;
    nlpDurationMs: number;
    graphDurationMs: number;
    promptDurationMs: number;
    aiDurationMs: number;
  };
  evidenceSummary: {
    graphHit: boolean;
    entityCount: number;
    relationCount: number;
    confidence: number;
  };
}

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
