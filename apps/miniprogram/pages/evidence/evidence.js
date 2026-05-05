const { getEvidenceWithSdk } = require('../../sdk/miniprogramSdk');
const { evidenceStore } = require('../../stores/evidenceStore');

function formatTimings(timings = {}) {
  const entries = Object.keys(timings).map((key) => `${key}: ${timings[key]}ms`);
  return entries.length ? entries.join(' · ') : '暂无耗时数据';
}

Page({
  data: {
    loading: true,
    errorMessage: '',
    messageId: null,
    entities: [],
    relations: [],
    sources: [],
    confidenceText: '-',
    timingsText: '暂无耗时数据',
  },

  onLoad(options) {
    const messageId = Number(options.messageId);
    this.setData({ messageId });
    this.loadEvidence(messageId);
  },

  async loadEvidence(messageId) {
    if (!messageId) {
      this.setData({ loading: false, errorMessage: '缺少消息 ID' });
      return;
    }

    try {
      const evidence = await getEvidenceWithSdk(messageId);
      evidenceStore.setEvidence(messageId, evidence);
      this.setData({
        loading: false,
        entities: evidence.entities || [],
        relations: evidence.relations || [],
        sources: evidence.sources || [],
        confidenceText: evidence.confidence === undefined ? '-' : `${Math.round(evidence.confidence * 100)}%`,
        timingsText: formatTimings(evidence.timings),
      });
    } catch (error) {
      this.setData({ loading: false, errorMessage: error.message || '依据加载失败' });
    }
  },
});
