const { post } = require('./request');

function submitFeedback(messageId, feedbackType, feedbackReason = '') {
  return post(`/api/client/messages/${messageId}/feedback`, {
    feedbackType,
    feedbackReason,
  });
}

module.exports = {
  submitFeedback,
};
