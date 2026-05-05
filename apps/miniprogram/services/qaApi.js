const { get, post } = require('./request');

function sendQuestion(payload) {
  return post('/api/client/qa/chat', payload);
}

function getEvidence(messageId) {
  return get(`/api/client/qa/messages/${messageId}/evidence`);
}

function cancelMessage(messageId, requestNo) {
  return post(`/api/client/qa/messages/${messageId}/cancel`, {
    requestNo,
    reason: 'USER_CANCEL',
  });
}

function listRecommendations() {
  return get('/api/client/qa/recommendations');
}

module.exports = {
  sendQuestion,
  getEvidence,
  cancelMessage,
  listRecommendations,
};
