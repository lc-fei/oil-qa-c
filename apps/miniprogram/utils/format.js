function normalizeText(value) {
  return String(value || '').trim();
}

function formatDayLabel(dateText) {
  const target = new Date(dateText);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const compare = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffDays = Math.floor((today.getTime() - compare.getTime()) / 86400000);

  if (Number.isNaN(diffDays) || diffDays <= 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays <= 7) return '近 7 天';
  return '更早';
}

function groupSessionsByDate(sessions) {
  const groups = {
    今天: [],
    昨天: [],
    '近 7 天': [],
    更早: [],
  };

  sessions
    .slice()
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .forEach((session) => {
      groups[formatDayLabel(session.updatedAt)].push(session);
    });

  return Object.keys(groups)
    .map((label) => ({ label, items: groups[label] }))
    .filter((group) => group.items.length > 0);
}

function formatWorkflowStatus(status) {
  const map = {
    PROCESSING: '处理中',
    SUCCESS: '成功',
    FAILED: '失败',
    PARTIAL_SUCCESS: '部分完成',
    INTERRUPTED: '已停止',
    NEED_CLARIFICATION: '需澄清',
  };
  return map[status] || status || '';
}

function formatStageAction(stage) {
  if (!stage) return '正在组织回答';

  const processingMap = {
    QUESTION_UNDERSTANDING: '正在理解问题',
    PLANNING: '正在规划检索路径',
    RETRIEVAL: '正在检索知识图谱',
    RANKING: '正在排序证据',
    EVIDENCE_RANKING: '正在排序证据',
    GENERATION: '正在生成答案',
    ARCHIVING: '正在归档结果',
  };
  const successMap = {
    QUESTION_UNDERSTANDING: '问题理解完成',
    PLANNING: '检索规划完成',
    RETRIEVAL: '知识检索完成',
    RANKING: '证据排序完成',
    EVIDENCE_RANKING: '证据排序完成',
    GENERATION: '答案生成完成',
    ARCHIVING: '结果归档完成',
  };

  if (stage.status === 'PROCESSING') return processingMap[stage.stageCode] || `正在进行${stage.stageName}`;
  if (stage.status === 'SUCCESS') return successMap[stage.stageCode] || `${stage.stageName}完成`;
  if (stage.status === 'FAILED') return stage.errorMessage || `${stage.stageName}失败`;
  return `${stage.stageName}：${formatWorkflowStatus(stage.status)}`;
}

function markdownToPlainText(markdown) {
  return String(markdown || '')
    .replace(/```[\s\S]*?```/g, '[代码片段]')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/#{1,6}\s?/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

module.exports = {
  normalizeText,
  formatDayLabel,
  groupSessionsByDate,
  formatWorkflowStatus,
  formatStageAction,
  markdownToPlainText,
};
