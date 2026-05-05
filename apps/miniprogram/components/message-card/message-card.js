Component({
  properties: {
    message: {
      type: Object,
      value: {},
    },
  },
  data: {
    displayAnswer: '',
    statusText: '',
    showActions: false,
  },
  observers: {
    message(message) {
      const statusMap = {
        PROCESSING: '生成中',
        SUCCESS: '已完成',
        FAILED: '失败',
        PARTIAL_SUCCESS: '部分完成',
        INTERRUPTED: '已停止',
      };

      this.setData({
        displayAnswer: message.answer || message.partialAnswer || message.question || '',
        statusText: statusMap[message.status] || message.status || '',
        showActions: message.status === 'SUCCESS' || message.status === 'PARTIAL_SUCCESS',
      });
    },
  },
  methods: {
    onFollowUpTap(event) {
      this.triggerEvent('followup', { question: event.currentTarget.dataset.question });
    },
    onEvidenceTap() {
      this.triggerEvent('evidence', { messageId: this.data.message.messageId });
    },
    onFavoriteTap() {
      this.triggerEvent('favorite', { messageId: this.data.message.messageId });
    },
    onLikeTap() {
      this.triggerEvent('feedback', { messageId: this.data.message.messageId, feedbackType: 'LIKE' });
    },
    onDislikeTap() {
      this.triggerEvent('feedback', { messageId: this.data.message.messageId, feedbackType: 'DISLIKE' });
    },
  },
});
