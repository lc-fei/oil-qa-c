const { groupSessionsByDate } = require('../utils/format');

const state = {
  sessions: [],
  sessionGroups: [],
  currentSessionId: null,
  currentSession: null,
  messages: [],
  recommendations: [],
  activeMessageId: null,
  activeRequestNo: '',
  isSending: false,
  evidenceCache: {},
};

const listeners = [];

function notify() {
  listeners.forEach((listener) => listener({ ...state }));
}

function upsertMessage(message) {
  const index = state.messages.findIndex((item) => item.messageId === message.messageId);
  if (index >= 0) {
    state.messages[index] = { ...state.messages[index], ...message };
  } else {
    state.messages.push(message);
  }
}

const chatStore = {
  subscribe(listener) {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index >= 0) listeners.splice(index, 1);
    };
  },
  getState() {
    return { ...state };
  },
  setSessions(sessions) {
    state.sessions = sessions || [];
    state.sessionGroups = groupSessionsByDate(state.sessions);
    notify();
  },
  setCurrentSession(detail) {
    state.currentSession = detail || null;
    state.currentSessionId = detail ? detail.sessionId : null;
    state.messages = detail && detail.messages ? detail.messages : [];
    notify();
  },
  resetCurrentSession() {
    state.currentSession = null;
    state.currentSessionId = null;
    state.messages = [];
    state.activeMessageId = null;
    state.activeRequestNo = '';
    state.isSending = false;
    notify();
  },
  setRecommendations(list) {
    state.recommendations = list || [];
    notify();
  },
  beginUserQuestion(question, sessionId, sdkClientMessageId) {
    const clientMessageId = sdkClientMessageId || Date.now();
    state.isSending = true;
    state.activeMessageId = clientMessageId;
    upsertMessage({
      messageId: clientMessageId,
      messageNo: `LOCAL_${clientMessageId}`,
      requestNo: '',
      sessionId,
      question,
      answer: '',
      status: 'PROCESSING',
      favorite: false,
      feedbackType: null,
      createdAt: new Date().toISOString(),
      workflowHint: '正在提交问题',
      followUps: [],
    });
    notify();
    return clientMessageId;
  },
  applyStreamStart(clientMessageId, chunk) {
    state.activeMessageId = chunk.messageId || clientMessageId;
    state.activeRequestNo = chunk.requestNo || '';
    const local = state.messages.find((message) => message.messageId === clientMessageId);
    upsertMessage({
      ...(local || {}),
      ...chunk,
      messageId: chunk.messageId || clientMessageId,
      question: local ? local.question : '',
      answer: local ? local.answer : '',
      status: 'PROCESSING',
      favorite: false,
      feedbackType: null,
    });
    notify();
  },
  appendChunk(chunk) {
    const messageId = chunk.messageId || state.activeMessageId;
    const current = state.messages.find((message) => message.messageId === messageId);
    if (!current) return;
    upsertMessage({
      ...current,
      answer: `${current.answer || ''}${chunk.delta || ''}`,
      streamSequence: chunk.sequence,
      workflow: chunk.workflow || current.workflow,
    });
    notify();
  },
  applyWorkflow(chunk) {
    const messageId = chunk.messageId || state.activeMessageId;
    const current = state.messages.find((message) => message.messageId === messageId);
    if (!current) return;
    const workflow = chunk.workflow || current.workflow || {
      status: 'PROCESSING',
      currentStage: '',
      stages: [],
      toolCalls: [],
    };
    upsertMessage({
      ...current,
      workflow,
      stage: chunk.stage || current.stage,
      toolCall: chunk.toolCall || current.toolCall,
    });
    notify();
  },
  finishMessage(result) {
    const payload = result.result || result;
    const messageId = result.messageId || payload.messageId || state.activeMessageId;
    const current = state.messages.find((message) => message.messageId === messageId) || {};
    upsertMessage({
      ...current,
      messageId,
      sessionId: result.sessionId || payload.sessionId || current.sessionId,
      sessionNo: result.sessionNo || payload.sessionNo || current.sessionNo,
      messageNo: result.messageNo || payload.messageNo || current.messageNo,
      requestNo: result.requestNo || payload.requestNo || current.requestNo,
      question: payload.question || current.question,
      answer: payload.answer || current.answer,
      status: payload.status || 'SUCCESS',
      followUps: payload.followUps || [],
      timings: payload.timings,
      evidenceSummary: payload.evidenceSummary,
      workflow: payload.workflow || result.workflow || current.workflow,
      favorite: current.favorite || false,
      feedbackType: current.feedbackType || null,
      finishedAt: new Date().toISOString(),
    });
    state.currentSessionId = result.sessionId || payload.sessionId || state.currentSessionId;
    state.isSending = false;
    state.activeMessageId = null;
    state.activeRequestNo = '';
    notify();
  },
  failMessage(errorMessage) {
    const current = state.messages.find((message) => message.messageId === state.activeMessageId);
    if (current) {
      upsertMessage({
        ...current,
        status: current.answer ? 'PARTIAL_SUCCESS' : 'FAILED',
        errorMessage,
      });
    }
    state.isSending = false;
    notify();
  },
  updateMessage(messageId, patch) {
    const current = state.messages.find((message) => message.messageId === Number(messageId));
    if (current) {
      upsertMessage({ ...current, ...patch });
      notify();
    }
  },
  setEvidence(messageId, evidence) {
    state.evidenceCache[messageId] = evidence;
    notify();
  },
};

module.exports = {
  chatStore,
};
