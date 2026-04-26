import { create } from 'zustand';
import type { FavoriteItemDetail, FavoriteItemSummary } from '@oil-qa-c/shared';

interface FavoriteState {
  items: FavoriteItemSummary[];
  detailByFavoriteId: Record<number, FavoriteItemDetail>;
  keyword: string;
  total: number;
  favoriteIdsByMessageId: Record<number, number>;
  setItems: (items: FavoriteItemSummary[]) => void;
  setTotal: (total: number) => void;
  setKeyword: (keyword: string) => void;
  upsertFavoriteItem: (item: FavoriteItemSummary) => void;
  setDetail: (detail: FavoriteItemDetail) => void;
  removeFavoriteById: (favoriteId: number) => void;
  bindMessageFavoriteId: (messageId: number, favoriteId: number) => void;
}

export const useFavoriteStore = create<FavoriteState>((set) => ({
  items: [],
  detailByFavoriteId: {},
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
    // total 由后端分页结果提供，收藏页标题和分页能力都依赖这个值。
    set({ total });
  },
  setKeyword(keyword) {
    // keyword 保留在 store 中，返回收藏页时可延续上一次检索条件。
    set({ keyword });
  },
  setDetail(detail) {
    // 收藏详情按 Collapse 展开懒加载，缓存后再次展开无需重复请求。
    set((state) => ({
      detailByFavoriteId: {
        ...state.detailByFavoriteId,
        [detail.favoriteId]: detail,
      },
    }));
  },
  upsertFavoriteItem(item) {
    set((state) => {
      // 新收藏先放到列表顶部，符合“最近收藏优先”的展示直觉。
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

      const nextDetailByFavoriteId = { ...state.detailByFavoriteId };
      delete nextDetailByFavoriteId[favoriteId];

      return {
        items: state.items.filter((item) => item.favoriteId !== favoriteId),
        total: removedItem ? Math.max(0, state.total - 1) : state.total,
        favoriteIdsByMessageId: nextFavoriteIdsByMessageId,
        detailByFavoriteId: nextDetailByFavoriteId,
      };
    });
  },
  bindMessageFavoriteId(messageId, favoriteId) {
    // 聊天页取消收藏需要 favoriteId，接口只给 messageId 时在这里建立映射。
    set((state) => ({
      favoriteIdsByMessageId: {
        ...state.favoriteIdsByMessageId,
        [messageId]: favoriteId,
      },
    }));
  },
}));
