import { createApiClient, createFavoriteApi, createFeedbackApi } from '@oil-qa-c/api';

const favoriteApi = createFavoriteApi(createApiClient());
const feedbackApi = createFeedbackApi(createApiClient());

export const favoriteService = {
  list: favoriteApi.list,
  favoriteMessage: favoriteApi.favoriteMessage,
  cancelFavorite: favoriteApi.cancelFavorite,
  submitFeedback: feedbackApi.submit,
};
