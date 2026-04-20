import { createApiClient, createRecommendationApi } from '@oil-qa-c/api';

const recommendationApi = createRecommendationApi(createApiClient());

export const recommendationService = {
  list: recommendationApi.list,
};
