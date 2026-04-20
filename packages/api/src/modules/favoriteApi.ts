import type { FavoriteItem, PaginatedResult } from '@oil-qa-c/shared';
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
      return client.get<PaginatedResult<FavoriteItem>>(url);
    },
    favoriteMessage(messageId: number) {
      return client.post<Record<string, never>, { favoriteId: number; messageId: number; favorite: boolean }>(
        `/api/client/messages/${messageId}/favorite`,
        {},
      );
    },
    cancelFavorite(favoriteId: number) {
      return client.delete(`/api/client/favorites/${favoriteId}`);
    },
  };
}
