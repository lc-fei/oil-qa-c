const { authStore } = require('../../stores/authStore');
const { chatStore } = require('../../stores/chatStore');
const miniprogramSdk = require('../../sdk/miniprogramSdk');
const { normalizeText, formatStageAction, markdownToPlainText } = require('../../utils/format');

const DEFAULT_RECOMMENDATIONS = [
  { id: 1, questionText: '什么是井壁失稳？' },
  { id: 2, questionText: '钻井液密度过高会带来哪些风险？' },
  { id: 3, questionText: '发生井漏时一般怎么处理？' },
];

function buildDisplayMessages(messages) {
  return messages.flatMap((message) => {
    const userMessage = {
      ...message,
      role: 'user',
      displayId: `${message.messageId}-q`,
      answer: message.question,
      status: '',
      followUps: [],
    };
    const stageHint = message.stage ? formatStageAction(message.stage) : '';
    const assistantMessage = {
      ...message,
      role: 'assistant',
      displayId: `${message.messageId}-a`,
      answer: markdownToPlainText(message.answer || message.partialAnswer || stageHint || '正在组织回答'),
    };
    return [userMessage, assistantMessage];
  });
}

Page({
  data: {
    userLabel: '用户',
    userMenuVisible: false,
    sessionDrawerVisible: false,
    currentTitle: '新对话',
    currentSessionId: null,
    sessionGroups: [],
    messages: [],
    displayMessages: [],
    recommendations: DEFAULT_RECOMMENDATIONS,
    question: '',
    contextMode: 'ON',
    answerMode: 'GRAPH_ENHANCED',
    isSending: false,
    scrollTarget: '',
  },

  onLoad(options) {
    this.unsubscribe = chatStore.subscribe((state) => this.syncFromStore(state));
    this.guardAuth();
    this.loadInitialData(options);
  },

  onUnload() {
    if (this.unsubscribe) this.unsubscribe();
    if (this.streamController) this.streamController.abort();
  },

  async guardAuth() {
    authStore.restore();
    if (!authStore.getToken()) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }

    try {
      const user = await authStore.loadCurrentUser();
      if (!user) throw new Error('登录已失效');
      this.setData({ userLabel: (user.nickname || user.username || '用户').slice(0, 2) });
    } catch (error) {
      authStore.clear();
      wx.redirectTo({ url: '/pages/login/login' });
    }
  },

  async loadInitialData(options = {}) {
    await Promise.all([this.loadSessions(), this.loadRecommendations()]);
    if (options.sessionId) {
      await this.loadSessionDetail(Number(options.sessionId), options.messageId ? Number(options.messageId) : null);
    }
  },

  syncFromStore(state) {
    const messages = state.messages || [];
    const displayMessages = buildDisplayMessages(messages);
    const latest = displayMessages[displayMessages.length - 1];
    this.setData({
      currentSessionId: state.currentSessionId,
      currentTitle: state.currentSession ? state.currentSession.title : '新对话',
      sessionGroups: state.sessionGroups || [],
      messages,
      displayMessages,
      recommendations: state.recommendations.length ? state.recommendations : this.data.recommendations,
      isSending: state.isSending,
      scrollTarget: latest ? `msg-${latest.displayId}` : '',
    });
  },

  async loadSessions() {
    try {
      const response = await miniprogramSdk.bootstrapSessionsWithSdk();
      chatStore.setSessions(response.sessions || []);
    } catch (error) {
      wx.showToast({ title: error.message || '会话加载失败', icon: 'none' });
    }
  },

  async loadRecommendations() {
    try {
      const response = await miniprogramSdk.listRecommendationsWithSdk();
      chatStore.setRecommendations(response.list || DEFAULT_RECOMMENDATIONS);
    } catch (error) {
      chatStore.setRecommendations(DEFAULT_RECOMMENDATIONS);
    }
  },

  async loadSessionDetail(sessionId, targetMessageId) {
    try {
      const response = await miniprogramSdk.selectSessionWithSdk(sessionId);
      chatStore.setCurrentSession(response.currentDetail);
      if (targetMessageId) {
        this.setData({ scrollTarget: `msg-${targetMessageId}-a` });
      }
    } catch (error) {
      wx.showToast({ title: error.message || '会话加载失败', icon: 'none' });
    }
  },

  onQuestionInput(event) {
    this.setData({ question: event.detail.value });
  },

  setContextMode(event) {
    this.setData({ contextMode: event.currentTarget.dataset.mode });
  },

  setAnswerMode(event) {
    this.setData({ answerMode: event.currentTarget.dataset.mode });
  },

  useRecommendation(event) {
    this.setData({ question: event.currentTarget.dataset.question });
    this.sendQuestion();
  },

  sendFollowUp(event) {
    this.setData({ question: event.detail.question });
    this.sendQuestion();
  },

  async sendQuestion() {
    const question = normalizeText(this.data.question);
    if (!question || this.data.isSending) return;

    const payload = {
      sessionId: this.data.currentSessionId || undefined,
      question,
      contextMode: this.data.contextMode,
      answerMode: this.data.answerMode,
    };
    const sdkStart = miniprogramSdk.startQuestionStreamWithSdk(payload);
    const clientMessageId = sdkStart.stream.clientMessageId;
    chatStore.beginUserQuestion(question, this.data.currentSessionId, clientMessageId);
    this.setData({ question: '' });

    this.streamController = miniprogramSdk.startQaStreamTransportWithSdk(payload, {
      onStart: (chunk) => chatStore.applyStreamStart(clientMessageId, chunk),
      onWorkflow: (chunk) => chatStore.applyWorkflow(chunk),
      onChunk: (chunk) => chatStore.appendChunk(chunk),
      onFinal: async (result) => {
        miniprogramSdk.finishQuestionStreamWithSdk(clientMessageId, result);
        chatStore.finishMessage(result);
        await this.loadSessions();
      },
      onError: async (error) => {
        // 流式链路不可用时降级到非流式接口，保证业务闭环仍可验证。
        try {
          const fallback = await miniprogramSdk.sendQuestionWithSdk(payload);
          miniprogramSdk.finishQuestionStreamWithSdk(clientMessageId, fallback);
          chatStore.finishMessage(fallback);
          await this.loadSessions();
        } catch (fallbackError) {
          miniprogramSdk.failQuestionStreamWithSdk(clientMessageId, error.errorMessage || fallbackError.message || '问答失败');
          chatStore.failMessage(error.errorMessage || fallbackError.message || '问答失败');
        }
      },
    });
  },

  async cancelGenerating() {
    const state = chatStore.getState();
    if (!state.activeMessageId) return;

    try {
      const response = await miniprogramSdk.cancelQaStreamMessageWithSdk(state.activeMessageId, state.activeRequestNo);
      miniprogramSdk.cancelQuestionStreamWithSdk(state.activeMessageId, response.answer || '');
      chatStore.updateMessage(state.activeMessageId, {
        status: response.status,
        answer: response.answer,
        interruptedReason: response.interruptedReason,
      });
      if (this.streamController) this.streamController.abort();
    } catch (error) {
      wx.showToast({ title: error.message || '停止失败', icon: 'none' });
    }
  },

  openSessions() {
    this.setData({ sessionDrawerVisible: true });
  },

  closeSessions() {
    this.setData({ sessionDrawerVisible: false });
  },

  newSession() {
    chatStore.resetCurrentSession();
    this.setData({ sessionDrawerVisible: false });
  },

  selectSession(event) {
    this.setData({ sessionDrawerVisible: false });
    this.loadSessionDetail(event.detail.sessionId);
  },

  renameSession(event) {
    wx.showModal({
      title: '重命名会话',
      editable: true,
      placeholderText: '输入新标题',
      content: event.detail.title,
      success: async (result) => {
        if (!result.confirm || !normalizeText(result.content)) return;
        await miniprogramSdk.renameSessionWithSdk(event.detail.sessionId, normalizeText(result.content));
        await this.loadSessions();
      },
    });
  },

  deleteSession(event) {
    wx.showModal({
      title: '删除会话',
      content: '删除后该会话不再显示，是否继续？',
      success: async (result) => {
        if (!result.confirm) return;
        await miniprogramSdk.deleteSessionWithSdk(event.detail.sessionId);
        if (this.data.currentSessionId === event.detail.sessionId) chatStore.resetCurrentSession();
        await this.loadSessions();
      },
    });
  },

  toggleUserMenu() {
    this.setData({ userMenuVisible: !this.data.userMenuVisible });
  },

  goFavorites() {
    wx.navigateTo({ url: '/pages/favorites/favorites' });
  },

  async logout() {
    await authStore.logout();
    wx.redirectTo({ url: '/pages/login/login' });
  },

  openEvidence(event) {
    wx.navigateTo({ url: `/pages/evidence/evidence?messageId=${event.detail.messageId}` });
  },

  async toggleFavorite(event) {
    const messageId = event.detail.messageId;
    const message = this.data.messages.find((item) => item.messageId === messageId);
    if (!message) return;

    try {
      if (message.favorite) {
        let favoriteId = message.favoriteId;
        if (!favoriteId) {
          // 会话详情只返回 favorite 布尔值，取消收藏前需要用收藏列表反查 favoriteId。
          const favoritePage = await miniprogramSdk.listFavoritesWithSdk({ pageNum: 1, pageSize: 100 });
          const matched = (favoritePage.list || []).find((item) => item.messageId === messageId);
          favoriteId = matched && matched.favoriteId;
        }

        if (!favoriteId) {
          wx.showToast({ title: '未找到收藏记录', icon: 'none' });
          return;
        }

        await miniprogramSdk.cancelFavoriteWithSdk(favoriteId);
        chatStore.updateMessage(messageId, { favorite: false, favoriteId: null });
      } else {
        const response = await miniprogramSdk.favoriteMessageWithSdk(messageId);
        chatStore.updateMessage(messageId, { favorite: true, favoriteId: response.favoriteId });
      }
    } catch (error) {
      wx.showToast({ title: error.message || '收藏操作失败', icon: 'none' });
    }
  },

  async submitFeedback(event) {
    const { messageId, feedbackType } = event.detail;
    const message = this.data.messages.find((item) => item.messageId === messageId);
    if (message && message.feedbackType === feedbackType) {
      wx.showToast({ title: '已提交该反馈', icon: 'none' });
      return;
    }

    try {
      const response = await miniprogramSdk.submitFeedbackWithSdk(messageId, feedbackType);
      chatStore.updateMessage(messageId, { feedbackType: response.feedbackType });
    } catch (error) {
      wx.showToast({ title: error.message || '反馈失败', icon: 'none' });
    }
  },
});
