import type { FavoriteItemSummary } from '@oil-qa-c/shared';
import { mobileSdk } from '../sdk';
import { createStore } from './createStore';

interface FavoriteState {
  favorites: FavoriteItemSummary[];
  loadFavorites: () => Promise<void>;
  removeFavorite: (favoriteId: number) => Promise<void>;
}

const favoriteStore = createStore<FavoriteState>({
  favorites: [],
  async loadFavorites() {
    const result = await mobileSdk.listFavorites();
    favoriteStore.setState({ favorites: result.list });
  },
  async removeFavorite(favoriteId) {
    await mobileSdk.removeFavorite(favoriteId);
    favoriteStore.setState((state) => ({
      ...state,
      favorites: state.favorites.filter((favorite) => favorite.favoriteId !== favoriteId),
    }));
  },
});

export function useFavoriteStore<TSelected>(selector: (state: FavoriteState) => TSelected) {
  return favoriteStore.useStore(selector);
}
