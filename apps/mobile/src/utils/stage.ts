import type { QaWorkflowStage } from '@oil-qa-c/shared';

const stageLabels: Record<string, string> = {
  QUESTION_UNDERSTANDING: '正在理解问题',
  PLANNING: '正在进行任务规划',
  RETRIEVAL: '正在进行知识检索',
  EVIDENCE_RANKING: '正在进行证据排序',
  EVIDENCE_SORTING: '正在进行证据排序',
  RANKING: '正在进行证据排序',
  GENERATION: '正在生成答案',
  ARCHIVING: '正在进行结果归档',
  RESULT_ARCHIVING: '正在进行结果归档',
  RESULT_ARCHIVE: '正在进行结果归档',
  ARCHIVE: '正在进行结果归档',
};

export function formatStage(stage?: QaWorkflowStage | null) {
  if (!stage) {
    return '正在组织回答';
  }

  if (stage.status === 'SUCCESS') {
    return `${stage.stageName}完成`;
  }

  if (stage.status === 'FAILED') {
    return `${stage.stageName}失败`;
  }

  return stageLabels[stage.stageCode] ?? `正在进行${stage.stageName}`;
}
