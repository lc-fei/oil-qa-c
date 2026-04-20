import { create } from 'zustand';
import type { FavoriteItem } from '@oil-qa-c/shared';

interface FavoriteState {
  items: FavoriteItem[];
  keyword: string;
  setItems: (items: FavoriteItem[]) => void;
  setKeyword: (keyword: string) => void;
}

export const useFavoriteStore = create<FavoriteState>((set) => ({
  items: [],
  keyword: '',
  setItems(items) {
    set({ items });
  },
  setKeyword(keyword) {
    set({ keyword });
  },
}));
