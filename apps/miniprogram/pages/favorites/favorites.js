const miniprogramSdk = require('../../sdk/miniprogramSdk');
const { favoriteStore } = require('../../stores/favoriteStore');

Page({
  data: {
    keyword: '',
    favorites: [],
    details: {},
    expandedId: null,
    pageNum: 1,
    pageSize: 20,
    total: 0,
    loading: false,
    finished: false,
  },

  onLoad() {
    this.loadFavorites(true);
  },

  onKeywordInput(event) {
    this.setData({ keyword: event.detail.value });
  },

  search() {
    this.loadFavorites(true);
  },

  async loadFavorites(reset = false) {
    if (this.data.loading) return;
    const pageNum = reset ? 1 : this.data.pageNum;
    this.setData({ loading: true });

    try {
      const response = await miniprogramSdk.listFavoritesWithSdk({
        keyword: this.data.keyword,
        pageNum,
        pageSize: this.data.pageSize,
      });
      const list = reset ? response.list || [] : this.data.favorites.concat(response.list || []);
      favoriteStore.setFavorites(list);
      this.setData({
        favorites: list,
        total: response.total || list.length,
        pageNum: pageNum + 1,
        finished: list.length >= (response.total || list.length),
      });
    } catch (error) {
      wx.showToast({ title: error.message || '收藏加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  loadMore() {
    if (!this.data.finished) {
      this.loadFavorites(false);
    }
  },

  async toggleDetail(event) {
    const favoriteId = Number(event.currentTarget.dataset.favoriteId);
    if (this.data.expandedId === favoriteId) {
      this.setData({ expandedId: null });
      return;
    }

    if (!this.data.details[favoriteId]) {
      try {
        const detail = await miniprogramSdk.getFavoriteDetailWithSdk(favoriteId);
        this.setData({ details: { ...this.data.details, [favoriteId]: detail } });
      } catch (error) {
        wx.showToast({ title: error.message || '收藏详情加载失败', icon: 'none' });
        return;
      }
    }

    this.setData({ expandedId: favoriteId });
  },

  goSession(event) {
    const { sessionId, messageId } = event.currentTarget.dataset;
    wx.redirectTo({ url: `/pages/chat/chat?sessionId=${sessionId}&messageId=${messageId}` });
  },

  async removeFavorite(event) {
    const favoriteId = Number(event.currentTarget.dataset.favoriteId);
    try {
      await miniprogramSdk.cancelFavoriteWithSdk(favoriteId);
      favoriteStore.removeFavorite(favoriteId);
      this.setData({
        favorites: this.data.favorites.filter((item) => item.favoriteId !== favoriteId),
        expandedId: this.data.expandedId === favoriteId ? null : this.data.expandedId,
      });
    } catch (error) {
      wx.showToast({ title: error.message || '取消收藏失败', icon: 'none' });
    }
  },
});
