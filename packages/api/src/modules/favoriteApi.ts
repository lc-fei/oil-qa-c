import type { FavoriteItemDetail, FavoriteItemSummary, PaginatedResult } from '@oil-qa-c/shared';
import type { ApiClient } from '../client';

export interface FavoriteQuery {
  keyword?: string;
  favoriteType?: 'MESSAGE' | 'SESSION';
  pageNum?: number;
  pageSize?: number;
}

export function createFavoriteApi(client: ApiClient) {
  return {
    list(query: FavoriteQuery = {}) {
      // 收藏列表只拉取轻量摘要，展开 Collapse 时再通过 detail 获取正文，降低首屏耗时。
      const params = new URLSearchParams();

      if (query.keyword) {
        params.set('keyword', query.keyword);
      }

      if (query.favoriteType) {
        params.set('favoriteType', query.favoriteType);
      }

      if (query.pageNum) {
        params.set('pageNum', String(query.pageNum));
      }

      if (query.pageSize) {
        params.set('pageSize', String(query.pageSize));
      }

      const queryString = params.toString();
      const url = queryString ? `/api/client/favorites?${queryString}` : '/api/client/favorites';
      return client.get<PaginatedResult<FavoriteItemSummary>>(url);
    },
    detail(favoriteId: number) {
      // 详情接口用于懒加载收藏问答正文，避免列表接口携带长回答。
      return client.get<FavoriteItemDetail>(`/api/client/favorites/${favoriteId}`);
    },
    favoriteMessage(messageId: number) {
      // 收藏动作以 messageId 为业务主键，SDK 会同步本地消息收藏状态。
      return client.post<Record<string, never>, { favoriteId: number; messageId: number; favorite: boolean }>(
        `/api/client/messages/${messageId}/favorite`,
        {},
      );
    },
    cancelFavorite(favoriteId: number) {
      // 取消收藏使用 favoriteId，保证可从收藏页直接操作，不依赖消息列表上下文。
      return client.delete(`/api/client/favorites/${favoriteId}`);
    },
  };
}
