import type { RecommendationItem } from '@oil-qa-c/shared';
import type { ApiClient } from '../client';

export function createRecommendationApi(client: ApiClient) {
  return {
    list() {
      return client.get<{ list: RecommendationItem[] }>('/api/client/qa/recommendations');
    },
  };
}
