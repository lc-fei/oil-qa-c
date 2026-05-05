const { authStore } = require('../../stores/authStore');
const { normalizeText } = require('../../utils/format');

Page({
  data: {
    account: '',
    password: '',
    submitting: false,
    errorMessage: '',
  },

  onLoad() {
    authStore.restore();
    if (authStore.getToken()) {
      wx.redirectTo({ url: '/pages/chat/chat' });
    }
  },

  onAccountInput(event) {
    this.setData({ account: event.detail.value, errorMessage: '' });
  },

  onPasswordInput(event) {
    this.setData({ password: event.detail.value, errorMessage: '' });
  },

  async submit() {
    const account = normalizeText(this.data.account);
    const password = normalizeText(this.data.password);

    if (!account || !password) {
      this.setData({ errorMessage: '请输入账号和密码' });
      return;
    }

    this.setData({ submitting: true, errorMessage: '' });
    try {
      await authStore.login({ account, password });
      wx.redirectTo({ url: '/pages/chat/chat' });
    } catch (error) {
      this.setData({ errorMessage: error.message || '登录失败' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
