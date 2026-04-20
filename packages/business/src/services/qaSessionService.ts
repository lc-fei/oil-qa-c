import { createApiClient, createQaSessionApi } from '@oil-qa-c/api';
import { createSessionDomainState, syncDomainStatesFromSession } from '@oil-qa-c/wasm-sdk';

const qaSessionApi = createQaSessionApi(createApiClient());

export const qaSessionService = {
  list: qaSessionApi.list,
  create: qaSessionApi.create,
  detail: qaSessionApi.detail,
  updateTitle: qaSessionApi.updateTitle,
  remove: qaSessionApi.remove,
  // 业务层只负责编排，领域状态的生成逻辑统一收口到 SDK 适配层。
  buildSessionDomainState: createSessionDomainState,
  buildDomainStatesFromDetail: syncDomainStatesFromSession,
};
