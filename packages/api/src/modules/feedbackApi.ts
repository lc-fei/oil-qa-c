import type { FeedbackType } from '@oil-qa-c/shared';
import type { ApiClient } from '../client';

export interface FeedbackPayload {
  feedbackType: FeedbackType;
  feedbackReason?: string;
}

export function createFeedbackApi(client: ApiClient) {
  return {
    submit(messageId: number, payload: FeedbackPayload) {
      return client.post<FeedbackPayload, { messageId: number; feedbackType: FeedbackType }>(
        `/api/client/messages/${messageId}/feedback`,
        payload,
      );
    },
  };
}
