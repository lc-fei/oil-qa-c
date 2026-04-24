import type { FeedbackType, FavoriteItem } from '@oil-qa-c/shared';
import { useChatStore, useFavoriteStore, useSessionStore } from '@oil-qa-c/store';
import {
  cancelFavoriteWithSdk,
  favoriteMessageWithSdk,
  listFavoritesWithSdk,
  submitFeedbackWithSdk,
} from '@oil-qa-c/wasm-sdk';

function buildOptimisticFavoriteItem(messageId: number): FavoriteItem | null {
  const chatState = useChatStore.getState();
  const sessionState = useFavoriteStore.getState();
  const targetMessage = chatState.messages.find((message) => message.messageId === messageId);

  if (!targetMessage) {
    return null;
  }

  return {
    favoriteId: sessionState.favoriteIdsByMessageId[messageId] ?? -messageId,
    favoriteType: 'MESSAGE',
    sessionId: useSessionStore.getState().currentSessionId ?? 0,
    messageId,
    title: targetMessage.question,
    question: targetMessage.question,
    answerSnippet: targetMessage.answerSummary || targetMessage.answer.slice(0, 120),
    createdAt: targetMessage.createdAt,
  };
}

export const favoriteService = {
  async list(options: { keyword?: string; favoriteType?: 'MESSAGE' | 'SESSION'; pageNum?: number; pageSize?: number } = {}) {
    const result = await listFavoritesWithSdk({
      keyword: options.keyword,
      favoriteType: options.favoriteType,
      pageNum: options.pageNum ?? 1,
      pageSize: options.pageSize ?? 20,
    });

    useFavoriteStore.getState().setItems(result.list);
    useFavoriteStore.getState().setTotal(result.total);
    useFavoriteStore.getState().setKeyword(options.keyword ?? '');
    return result;
  },
  async favoriteMessage(messageId: number) {
    const result = await favoriteMessageWithSdk(messageId);

    useChatStore.getState().updateMessageFavorite(messageId, true);
    useFavoriteStore.getState().bindMessageFavoriteId(messageId, result.favoriteId);

    const optimisticItem = buildOptimisticFavoriteItem(messageId);
    if (optimisticItem) {
      useFavoriteStore.getState().upsertFavoriteItem({
        ...optimisticItem,
        favoriteId: result.favoriteId,
      });
    }

    return result;
  },
  async cancelFavorite(favoriteId: number, messageId?: number) {
    await cancelFavoriteWithSdk(favoriteId);

    useFavoriteStore.getState().removeFavoriteById(favoriteId);
    if (messageId) {
      useChatStore.getState().updateMessageFavorite(messageId, false);
    }
  },
  async toggleMessageFavorite(messageId: number) {
    const favoriteId = useFavoriteStore.getState().favoriteIdsByMessageId[messageId];
    const targetMessage = useChatStore.getState().messages.find((message) => message.messageId === messageId);

    if (targetMessage?.favorite && favoriteId) {
      await this.cancelFavorite(favoriteId, messageId);
      return { favorite: false, favoriteId };
    }

    if (targetMessage?.favorite && !favoriteId) {
      // 历史消息已是收藏态但当前缓存没有 favoriteId 时，先从收藏列表恢复映射再执行取消。
      const favorites = await this.list({ favoriteType: 'MESSAGE', pageNum: 1, pageSize: 100 });
      const matchedFavorite = favorites.list.find((item) => item.messageId === messageId);

      if (matchedFavorite) {
        await this.cancelFavorite(matchedFavorite.favoriteId, messageId);
        return { favorite: false, favoriteId: matchedFavorite.favoriteId };
      }
    }

    const result = await this.favoriteMessage(messageId);
    return { favorite: true, favoriteId: result.favoriteId };
  },
  submitFeedback(messageId: number, feedbackType: FeedbackType, feedbackReason?: string) {
    return submitFeedbackWithSdk(messageId, feedbackType, feedbackReason);
  },
};
