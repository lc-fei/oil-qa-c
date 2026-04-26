import type { RecommendationItem } from '@oil-qa-c/shared';
import type { ApiClient } from '../client';

export function createRecommendationApi(client: ApiClient) {
  return {
    list() {
      // 独立模块保留推荐问题能力，当前 Web 主要通过 qaChatApi 的同名接口调用。
      return client.get<{ list: RecommendationItem[] }>('/api/client/qa/recommendations');
    },
  };
}
