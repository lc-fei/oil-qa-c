const authApi = require('../services/authApi');
const sessionApi = require('../services/sessionApi');
const qaApi = require('../services/qaApi');
const favoriteApi = require('../services/favoriteApi');
const feedbackApi = require('../services/feedbackApi');

function normalizePayload(payload) {
  return payload || {};
}

function invokeSdkTransport(request) {
  const payload = normalizePayload(request.payload);

  switch (request.method) {
    case 'auth.login':
      return authApi.login(payload);
    case 'auth.current_user':
      return authApi.getCurrentUser();
    case 'auth.logout':
      return authApi.logout();
    case 'session.list':
      return sessionApi.listSessions(payload);
    case 'session.detail':
      return sessionApi.getSessionDetail(payload.sessionId);
    case 'session.create':
      return sessionApi.createSession({ title: payload.title });
    case 'session.rename':
      return sessionApi.renameSession(payload.sessionId, payload.title);
    case 'session.delete':
      return sessionApi.deleteSession(payload.sessionId);
    case 'recommendation.list':
      return qaApi.listRecommendations();
    case 'chat.send':
      return qaApi.sendQuestion(payload);
    case 'chat.cancel':
      return qaApi.cancelMessage(payload.messageId, payload.requestNo);
    case 'chat.evidence':
      return qaApi.getEvidence(payload.messageId);
    case 'favorite.list':
      return favoriteApi.listFavorites(payload);
    case 'favorite.detail':
      return favoriteApi.getFavoriteDetail(payload.favoriteId);
    case 'favorite.add':
      return favoriteApi.addFavorite(payload.messageId);
    case 'favorite.remove':
      return favoriteApi.removeFavorite(payload.favoriteId);
    case 'feedback.submit':
      return feedbackApi.submitFeedback(payload.messageId, payload.feedbackType, payload.feedbackReason);
    default:
      throw new Error(`未支持的小程序 SDK transport 方法: ${request.method}`);
  }
}

module.exports = {
  invokeSdkTransport,
};
