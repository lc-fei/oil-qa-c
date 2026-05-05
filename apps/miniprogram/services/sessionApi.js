const { get, post, put, del } = require('./request');

function buildQuery(params = {}) {
  const entries = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
  return entries.length ? `?${entries.join('&')}` : '';
}

function listSessions(params = {}) {
  return get(`/api/client/qa/sessions${buildQuery({ pageNum: 1, pageSize: 50, ...params })}`);
}

function createSession(payload = {}) {
  return post('/api/client/qa/sessions', payload);
}

function getSessionDetail(sessionId) {
  return get(`/api/client/qa/sessions/${sessionId}`);
}

function renameSession(sessionId, title) {
  return put(`/api/client/qa/sessions/${sessionId}`, { title });
}

function deleteSession(sessionId) {
  return del(`/api/client/qa/sessions/${sessionId}`);
}

module.exports = {
  listSessions,
  createSession,
  getSessionDetail,
  renameSession,
  deleteSession,
};
