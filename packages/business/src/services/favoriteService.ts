import type { FavoriteItemDetail, FavoriteItemSummary, FeedbackType } from '@oil-qa-c/shared';
import { useChatStore, useFavoriteStore, useSessionStore } from '@oil-qa-c/store';
import {
  cancelFavoriteWithSdk,
  favoriteMessageWithSdk,
  getFavoriteDetailWithSdk,
  listFavoritesWithSdk,
  submitFeedbackWithSdk,
} from '@oil-qa-c/wasm-sdk';

function buildOptimisticFavoriteItem(messageId: number): FavoriteItemSummary | null {
  const chatState = useChatStore.getState();
  const sessionState = useFavoriteStore.getState();
  const targetMessage = chatState.messages.find((message) => message.messageId === messageId);

  if (!targetMessage) {
    // 消息不在当前会话时不能构造可靠概览，交给下一次收藏列表查询恢复真实状态。
    return null;
  }

  return {
    favoriteId: sessionState.favoriteIdsByMessageId[messageId] ?? -messageId,
    favoriteType: 'MESSAGE',
    sessionId: useSessionStore.getState().currentSessionId ?? 0,
    messageId,
    title: targetMessage.question,
    createdAt: targetMessage.createdAt,
  };
}

export const favoriteService = {
  async list(options: { keyword?: string; favoriteType?: 'MESSAGE' | 'SESSION'; pageNum?: number; pageSize?: number } = {}) {
    // 收藏列表接口只返回概览，详情内容由 getDetail 在用户展开时按需拉取。
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

    // 收藏成功后立即更新当前消息按钮状态，避免等待列表刷新造成交互延迟。
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
  async getDetail(favoriteId: number): Promise<FavoriteItemDetail> {
    const cachedDetail = useFavoriteStore.getState().detailByFavoriteId[favoriteId];
    if (cachedDetail) {
      // 展开过的收藏详情直接复用缓存，降低重复打开 Collapse 的接口压力。
      return cachedDetail;
    }

    const detail = await getFavoriteDetailWithSdk(favoriteId);
    useFavoriteStore.getState().setDetail(detail);
    return detail;
  },
  async cancelFavorite(favoriteId: number, messageId?: number) {
    await cancelFavoriteWithSdk(favoriteId);

    // 取消收藏需要同时更新收藏页列表和当前聊天消息的收藏态。
    useFavoriteStore.getState().removeFavoriteById(favoriteId);
    if (messageId) {
      useChatStore.getState().updateMessageFavorite(messageId, false);
    }
  },
  async toggleMessageFavorite(messageId: number) {
    const favoriteId = useFavoriteStore.getState().favoriteIdsByMessageId[messageId];
    const targetMessage = useChatStore.getState().messages.find((message) => message.messageId === messageId);

    if (targetMessage?.favorite && favoriteId) {
      // 已有 favoriteId 时可直接删除收藏，避免额外查询收藏列表。
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
