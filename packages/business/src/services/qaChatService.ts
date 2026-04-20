import { createApiClient, createQaChatApi } from '@oil-qa-c/api';
import { applyMessageChunk, createChatDomainState, isWasmSdkReady } from '@oil-qa-c/wasm-sdk';

const qaChatApi = createQaChatApi(createApiClient());

export const qaChatService = {
  // 业务层只编排调用链，真正的消息领域规则统一交给 SDK 适配层。
  isSdkReady: isWasmSdkReady,
  buildChatDomainState: createChatDomainState,
  applyMessageChunk,
  sendQuestion: qaChatApi.sendQuestion,
  getEvidence: qaChatApi.getEvidence,
  getRecommendations: qaChatApi.getRecommendations,
};
