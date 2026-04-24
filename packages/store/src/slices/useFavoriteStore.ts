import { create } from 'zustand';
import type { FavoriteItem } from '@oil-qa-c/shared';

interface FavoriteState {
  items: FavoriteItem[];
  keyword: string;
  total: number;
  favoriteIdsByMessageId: Record<number, number>;
  setItems: (items: FavoriteItem[]) => void;
  setTotal: (total: number) => void;
  setKeyword: (keyword: string) => void;
  upsertFavoriteItem: (item: FavoriteItem) => void;
  removeFavoriteById: (favoriteId: number) => void;
  bindMessageFavoriteId: (messageId: number, favoriteId: number) => void;
}

export const useFavoriteStore = create<FavoriteState>((set) => ({
  items: [],
  keyword: '',
  total: 0,
  favoriteIdsByMessageId: {},
  setItems(items) {
    // 收藏列表落库时顺手重建消息到 favoriteId 的索引，便于聊天页直接取消收藏。
    set({
      items,
      favoriteIdsByMessageId: items.reduce<Record<number, number>>((accumulator, item) => {
        accumulator[item.messageId] = item.favoriteId;
        return accumulator;
      }, {}),
    });
  },
  setTotal(total) {
    set({ total });
  },
  setKeyword(keyword) {
    set({ keyword });
  },
  upsertFavoriteItem(item) {
    set((state) => {
      const nextItems = state.items.filter((favorite) => favorite.favoriteId !== item.favoriteId);
      nextItems.unshift(item);

      return {
        items: nextItems,
        total: state.total + (state.items.some((favorite) => favorite.favoriteId === item.favoriteId) ? 0 : 1),
        favoriteIdsByMessageId: {
          ...state.favoriteIdsByMessageId,
          [item.messageId]: item.favoriteId,
        },
      };
    });
  },
  removeFavoriteById(favoriteId) {
    set((state) => {
      const removedItem = state.items.find((item) => item.favoriteId === favoriteId);
      const nextFavoriteIdsByMessageId = { ...state.favoriteIdsByMessageId };

      if (removedItem) {
        delete nextFavoriteIdsByMessageId[removedItem.messageId];
      }

      return {
        items: state.items.filter((item) => item.favoriteId !== favoriteId),
        total: removedItem ? Math.max(0, state.total - 1) : state.total,
        favoriteIdsByMessageId: nextFavoriteIdsByMessageId,
      };
    });
  },
  bindMessageFavoriteId(messageId, favoriteId) {
    set((state) => ({
      favoriteIdsByMessageId: {
        ...state.favoriteIdsByMessageId,
        [messageId]: favoriteId,
      },
    }));
  },
}));
