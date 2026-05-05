const state = {
  favorites: [],
  favoriteMap: {},
};

const listeners = [];

function notify() {
  listeners.forEach((listener) => listener({ ...state }));
}

const favoriteStore = {
  subscribe(listener) {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index >= 0) listeners.splice(index, 1);
    };
  },
  getState() {
    return { ...state };
  },
  setFavorites(list) {
    state.favorites = list || [];
    state.favoriteMap = state.favorites.reduce((map, item) => {
      map[item.favoriteId] = item;
      return map;
    }, {});
    notify();
  },
  upsertFavorite(item) {
    const index = state.favorites.findIndex((favorite) => favorite.favoriteId === item.favoriteId);
    if (index >= 0) {
      state.favorites[index] = { ...state.favorites[index], ...item };
    } else {
      state.favorites.unshift(item);
    }
    state.favoriteMap = state.favorites.reduce((map, favorite) => {
      map[favorite.favoriteId] = favorite;
      return map;
    }, {});
    notify();
  },
  removeFavorite(favoriteId) {
    state.favorites = state.favorites.filter((item) => item.favoriteId !== favoriteId);
    delete state.favoriteMap[favoriteId];
    notify();
  },
};

module.exports = {
  favoriteStore,
};
