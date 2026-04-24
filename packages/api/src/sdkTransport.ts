import { getTokenStorage } from '@oil-qa-c/shared';
import type { CurrentUser, LoginRequest, LoginResponse, RecommendationItem } from '@oil-qa-c/shared';
import { createApiClient } from './client';
import { createAuthApi } from './modules/authApi';
import { createQaSessionApi } from './modules/qaSessionApi';
import { createRecommendationApi } from './modules/recommendationApi';
import { createQaChatApi } from './modules/qaChatApi';
import { createFavoriteApi } from './modules/favoriteApi';
import { createFeedbackApi } from './modules/feedbackApi';

export interface SdkTransportRequest {
  method: string;
  payload: unknown;
  authToken?: string | null;
}

function normalizeSdkPayload<TValue>(value: TValue): TValue {
  // serde_wasm_bindgen 在遇到泛型 JSON 对象时，可能把对象序列化为 JS Map。
  // Web transport 在真正发 HTTP 请求前统一转回普通对象，避免 JSON.stringify 产出 {}。
  if (value instanceof Map) {
    return Object.fromEntries(
      Array.from(value.entries()).map(([entryKey, entryValue]) => [entryKey, normalizeSdkPayload(entryValue)]),
    ) as TValue;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeSdkPayload(item)) as TValue;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([entryKey, entryValue]) => [
        entryKey,
        normalizeSdkPayload(entryValue),
      ]),
    ) as TValue;
  }

  return value;
}

function createScopedClient(authToken?: string | null) {
  // SDK transport 允许临时覆盖 token，保证登录恢复等流程不依赖页面层自己拼请求头。
  return createApiClient({
    getToken: () => authToken ?? getTokenStorage().getToken(),
  });
}

export function createWebSdkTransport() {
  return async function invokeTransport(request: SdkTransportRequest) {
    const normalizedPayload = normalizeSdkPayload(request.payload);
    const client = createScopedClient(request.authToken);
    const authApi = createAuthApi(client);
    const sessionApi = createQaSessionApi(client);
    const recommendationApi = createRecommendationApi(client);
    const chatApi = createQaChatApi(client);
    const favoriteApi = createFavoriteApi(client);
    const feedbackApi = createFeedbackApi(client);

    switch (request.method) {
      case 'auth.login':
        return authApi.login(normalizedPayload as LoginRequest) as Promise<LoginResponse>;
      case 'auth.current_user':
        return authApi.getCurrentUser() as Promise<CurrentUser>;
      case 'auth.logout':
        await authApi.logout();
        return null;
      case 'session.list':
        return sessionApi.list(normalizedPayload as Parameters<typeof sessionApi.list>[0]);
      case 'session.detail': {
        const payload = normalizedPayload as { sessionId: number };
        return sessionApi.detail(payload.sessionId);
      }
      case 'session.create':
        return sessionApi.create(normalizedPayload as Parameters<typeof sessionApi.create>[0]);
      case 'session.rename': {
        const payload = normalizedPayload as { sessionId: number; title: string };
        await sessionApi.updateTitle(payload.sessionId, { title: payload.title });
        return null;
      }
      case 'session.delete': {
        const payload = normalizedPayload as { sessionId: number };
        await sessionApi.remove(payload.sessionId);
        return null;
      }
      case 'recommendation.list':
        return recommendationApi.list() as Promise<{ list: RecommendationItem[] }>;
      case 'chat.send':
        return chatApi.sendQuestion(normalizedPayload as Parameters<typeof chatApi.sendQuestion>[0]);
      case 'chat.evidence': {
        const payload = normalizedPayload as { messageId: number };
        return chatApi.getEvidence(payload.messageId);
      }
      case 'favorite.list':
        return favoriteApi.list(normalizedPayload as Parameters<typeof favoriteApi.list>[0]);
      case 'favorite.add': {
        const payload = normalizedPayload as { messageId: number };
        return favoriteApi.favoriteMessage(payload.messageId);
      }
      case 'favorite.remove': {
        const payload = normalizedPayload as { favoriteId: number };
        await favoriteApi.cancelFavorite(payload.favoriteId);
        return null;
      }
      case 'feedback.submit': {
        const payload = normalizedPayload as { messageId: number; feedbackType: 'LIKE' | 'DISLIKE'; feedbackReason?: string };
        return feedbackApi.submit(payload.messageId, {
          feedbackType: payload.feedbackType,
          feedbackReason: payload.feedbackReason,
        });
      }
      default:
        throw new Error(`未支持的 SDK transport 方法: ${request.method}`);
    }
  };
}
