const { invokeSdkTransport } = require('./sdkTransport');
const { invokeSdkStorage } = require('./sdkStorage');
const streamApi = require('../services/streamApi');

let sdkReady = false;
let sdkSnapshot = {
  sessions: [],
  currentDetail: null,
};

function createSessionState(sessions, currentSessionId) {
  return {
    currentSessionId: currentSessionId || null,
    orderedSessionIds: (sessions || []).map((session) => session.sessionId),
    emptySession: !currentSessionId,
  };
}

function createChatState(messages) {
  return {
    activeMessageId: null,
    status: 'IDLE',
    messageIds: (messages || []).map((message) => message.messageId),
    streamBuffer: {},
  };
}

function buildSessionSdkResult(sessions, currentDetail) {
  sdkSnapshot = {
    sessions: sessions || [],
    currentDetail: currentDetail || null,
  };

  return {
    sessions: sdkSnapshot.sessions,
    currentDetail: sdkSnapshot.currentDetail,
    sessionState: createSessionState(sdkSnapshot.sessions, currentDetail ? currentDetail.sessionId : null),
    chatState: createChatState(currentDetail ? currentDetail.messages || [] : []),
  };
}

async function invokeMiniProgramSdk(method, payload = {}, authToken) {
  if (!sdkReady && method !== 'system.status') {
    initMiniprogramSdk();
  }

  return invokeSdkTransport({
    method,
    payload,
    authToken,
  });
}

function initMiniprogramSdk() {
  // 小程序接入层注册 transport/storage 的职责与 Web WASM SDK 初始化保持一致。
  sdkReady = true;
  return {
    sdkStatus: 'miniprogram-adapter-ready',
    platform: 'wechat-miniprogram',
  };
}

function isMiniprogramSdkReady() {
  return sdkReady;
}

async function loginWithSdk(account, password) {
  const loginResult = await invokeMiniProgramSdk('auth.login', { account, password });
  await invokeSdkStorage({ action: 'set', key: 'authToken', value: loginResult.token });
  const currentUser = await invokeMiniProgramSdk('auth.current_user', {}, loginResult.token).catch(() => ({
    userId: loginResult.userId,
    username: loginResult.username,
    account: loginResult.account,
    nickname: loginResult.nickname || loginResult.username,
    roles: loginResult.roles || [],
    status: loginResult.status || 1,
  }));
  await invokeSdkStorage({ action: 'set', key: 'currentUser', value: currentUser });

  return {
    token: loginResult.token,
    currentUser,
    status: 'AUTHENTICATED',
  };
}

async function restoreAuthSessionWithSdk() {
  const token = await invokeSdkStorage({ action: 'get', key: 'authToken' });
  if (!token) {
    return { token: null, currentUser: null, status: 'ANONYMOUS' };
  }

  const currentUser = await invokeMiniProgramSdk('auth.current_user', {}, token);
  await invokeSdkStorage({ action: 'set', key: 'currentUser', value: currentUser });
  return {
    token,
    currentUser,
    status: 'AUTHENTICATED',
  };
}

async function logoutWithSdk() {
  try {
    await invokeMiniProgramSdk('auth.logout', {});
  } finally {
    await invokeSdkStorage({ action: 'remove', key: 'authToken' });
    await invokeSdkStorage({ action: 'remove', key: 'currentUser' });
  }

  return { token: null, currentUser: null, status: 'ANONYMOUS' };
}

async function bootstrapSessionsWithSdk(options = {}) {
  const response = await invokeMiniProgramSdk('session.list', { pageNum: 1, pageSize: 50, ...options });
  return buildSessionSdkResult(response.list || [], null);
}

async function selectSessionWithSdk(sessionId) {
  const detail = await invokeMiniProgramSdk('session.detail', { sessionId });
  return buildSessionSdkResult(sdkSnapshot.sessions, detail);
}

async function createSessionWithSdk(title) {
  const created = await invokeMiniProgramSdk('session.create', { title });
  const detail = {
    sessionId: created.sessionId,
    sessionNo: created.sessionNo,
    title: created.title || title || '新对话',
    messages: [],
  };
  const sessions = [
    {
      sessionId: detail.sessionId,
      sessionNo: detail.sessionNo,
      title: detail.title,
      lastQuestion: '',
      messageCount: 0,
      updatedAt: new Date().toISOString(),
      isFavorite: false,
    },
    ...sdkSnapshot.sessions.filter((session) => session.sessionId !== detail.sessionId),
  ];
  return buildSessionSdkResult(sessions, detail);
}

async function renameSessionWithSdk(sessionId, title) {
  await invokeMiniProgramSdk('session.rename', { sessionId, title });
  const sessions = sdkSnapshot.sessions.map((session) => (session.sessionId === sessionId ? { ...session, title } : session));
  const detail =
    sdkSnapshot.currentDetail && sdkSnapshot.currentDetail.sessionId === sessionId
      ? { ...sdkSnapshot.currentDetail, title }
      : sdkSnapshot.currentDetail;
  return buildSessionSdkResult(sessions, detail);
}

async function deleteSessionWithSdk(sessionId) {
  await invokeMiniProgramSdk('session.delete', { sessionId });
  const sessions = sdkSnapshot.sessions.filter((session) => session.sessionId !== sessionId);
  const detail =
    sdkSnapshot.currentDetail && sdkSnapshot.currentDetail.sessionId === sessionId ? null : sdkSnapshot.currentDetail;
  return buildSessionSdkResult(sessions, detail);
}

async function listRecommendationsWithSdk() {
  return invokeMiniProgramSdk('recommendation.list', {});
}

async function sendQuestionWithSdk(payload) {
  return invokeMiniProgramSdk('chat.send', payload);
}

function startQaStreamTransportWithSdk(payload, handlers) {
  // 流式 chunk 消费属于小程序平台 transport，页面只能通过 SDK façade 启动。
  return streamApi.startQaStream(payload, handlers);
}

function startQuestionStreamWithSdk(payload) {
  const clientMessageId = Date.now();
  const currentDetail = sdkSnapshot.currentDetail || {
    sessionId: payload.sessionId || 0,
    sessionNo: '',
    title: payload.question.slice(0, 18) || '新对话',
    messages: [],
  };
  const processingMessage = {
    messageId: clientMessageId,
    messageNo: `LOCAL_${clientMessageId}`,
    requestNo: '',
    question: payload.question,
    answer: '',
    status: 'PROCESSING',
    favorite: false,
    feedbackType: null,
    createdAt: new Date().toISOString(),
  };
  buildSessionSdkResult(sdkSnapshot.sessions, {
    ...currentDetail,
    messages: [...(currentDetail.messages || []), processingMessage],
  });

  return {
    stream: {
      clientMessageId,
      requestNo: '',
      sessionId: payload.sessionId || 0,
    },
    sessionResult: buildSessionSdkResult(sdkSnapshot.sessions, sdkSnapshot.currentDetail),
  };
}

function finishQuestionStreamWithSdk(clientMessageId, result) {
  const payload = result.result || result;
  const finalMessage = {
    messageId: result.messageId || payload.messageId,
    messageNo: result.messageNo || payload.messageNo,
    requestNo: result.requestNo || payload.requestNo,
    question: payload.question,
    answer: payload.answer,
    status: payload.status || 'SUCCESS',
    followUps: payload.followUps || [],
    timings: payload.timings,
    evidenceSummary: payload.evidenceSummary,
    workflow: payload.workflow || result.workflow,
    favorite: false,
    feedbackType: null,
    createdAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
  };
  const currentDetail = sdkSnapshot.currentDetail || {
    sessionId: result.sessionId || payload.sessionId,
    sessionNo: result.sessionNo || payload.sessionNo,
    title: payload.question.slice(0, 18) || '新对话',
    messages: [],
  };
  const messages = (currentDetail.messages || []).filter(
    (message) => message.messageId !== clientMessageId && message.messageId !== finalMessage.messageId,
  );
  return buildSessionSdkResult(sdkSnapshot.sessions, {
    ...currentDetail,
    sessionId: result.sessionId || payload.sessionId,
    sessionNo: result.sessionNo || payload.sessionNo,
    messages: [...messages, finalMessage],
  });
}

function failQuestionStreamWithSdk(clientMessageId, errorMessage, partialAnswer = '') {
  const detail = sdkSnapshot.currentDetail;
  if (!detail) return buildSessionSdkResult(sdkSnapshot.sessions, null);
  const messages = (detail.messages || []).map((message) =>
    message.messageId === clientMessageId
      ? { ...message, answer: partialAnswer, status: partialAnswer ? 'PARTIAL_SUCCESS' : 'FAILED', errorMessage }
      : message,
  );
  return buildSessionSdkResult(sdkSnapshot.sessions, { ...detail, messages });
}

async function cancelQaStreamMessageWithSdk(messageId, requestNo) {
  return invokeMiniProgramSdk('chat.cancel', { messageId, requestNo });
}

function cancelQuestionStreamWithSdk(clientMessageId, partialAnswer = '') {
  const detail = sdkSnapshot.currentDetail;
  if (!detail) return buildSessionSdkResult(sdkSnapshot.sessions, null);
  const messages = (detail.messages || []).map((message) =>
    message.messageId === clientMessageId
      ? { ...message, answer: partialAnswer, partialAnswer, status: 'INTERRUPTED', interruptedReason: 'USER_CANCEL' }
      : message,
  );
  return buildSessionSdkResult(sdkSnapshot.sessions, { ...detail, messages });
}

async function getEvidenceWithSdk(messageId) {
  return invokeMiniProgramSdk('chat.evidence', { messageId });
}

async function listFavoritesWithSdk(options = {}) {
  return invokeMiniProgramSdk('favorite.list', { favoriteType: 'MESSAGE', pageNum: 1, pageSize: 20, ...options });
}

async function getFavoriteDetailWithSdk(favoriteId) {
  return invokeMiniProgramSdk('favorite.detail', { favoriteId });
}

async function favoriteMessageWithSdk(messageId) {
  return invokeMiniProgramSdk('favorite.add', { messageId });
}

async function cancelFavoriteWithSdk(favoriteId) {
  return invokeMiniProgramSdk('favorite.remove', { favoriteId });
}

async function submitFeedbackWithSdk(messageId, feedbackType, feedbackReason = '') {
  return invokeMiniProgramSdk('feedback.submit', { messageId, feedbackType, feedbackReason });
}

module.exports = {
  initMiniprogramSdk,
  isMiniprogramSdkReady,
  invokeMiniProgramSdk,
  loginWithSdk,
  restoreAuthSessionWithSdk,
  logoutWithSdk,
  bootstrapSessionsWithSdk,
  selectSessionWithSdk,
  createSessionWithSdk,
  renameSessionWithSdk,
  deleteSessionWithSdk,
  listRecommendationsWithSdk,
  sendQuestionWithSdk,
  startQaStreamTransportWithSdk,
  startQuestionStreamWithSdk,
  finishQuestionStreamWithSdk,
  failQuestionStreamWithSdk,
  cancelQaStreamMessageWithSdk,
  cancelQuestionStreamWithSdk,
  getEvidenceWithSdk,
  listFavoritesWithSdk,
  getFavoriteDetailWithSdk,
  favoriteMessageWithSdk,
  cancelFavoriteWithSdk,
  submitFeedbackWithSdk,
};
