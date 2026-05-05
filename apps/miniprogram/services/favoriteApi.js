const { get, post, del } = require('./request');

function buildQuery(params = {}) {
  const entries = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`);
  return entries.length ? `?${entries.join('&')}` : '';
}

function listFavorites(params = {}) {
  return get(`/api/client/favorites${buildQuery({ pageNum: 1, pageSize: 20, favoriteType: 'MESSAGE', ...params })}`);
}

function getFavoriteDetail(favoriteId) {
  return get(`/api/client/favorites/${favoriteId}`);
}

function addFavorite(messageId) {
  return post(`/api/client/messages/${messageId}/favorite`, {});
}

function removeFavorite(favoriteId) {
  return del(`/api/client/favorites/${favoriteId}`);
}

module.exports = {
  listFavorites,
  getFavoriteDetail,
  addFavorite,
  removeFavorite,
};
