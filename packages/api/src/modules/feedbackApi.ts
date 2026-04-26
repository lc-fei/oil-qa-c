import type { FeedbackType } from '@oil-qa-c/shared';
import type { ApiClient } from '../client';

export interface FeedbackPayload {
  feedbackType: FeedbackType;
  feedbackReason?: string;
}

export function createFeedbackApi(client: ApiClient) {
  return {
    submit(messageId: number, payload: FeedbackPayload) {
      // 反馈只绑定消息，不绑定收藏状态，便于后续在会话页和收藏页复用。
      return client.post<FeedbackPayload, { messageId: number; feedbackType: FeedbackType }>(
        `/api/client/messages/${messageId}/feedback`,
        payload,
      );
    },
  };
}
