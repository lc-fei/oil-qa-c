import { listRecommendationsWithSdk } from '@oil-qa-c/wasm-sdk';

export const recommendationService = {
  // 推荐问题也统一通过 SDK façade 暴露，页面层不再感知独立接口地址。
  list: listRecommendationsWithSdk,
};
