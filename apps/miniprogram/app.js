const { authStore } = require('./stores/authStore');
const { configureRuntime } = require('./utils/config');
const { initMiniprogramSdk } = require('./sdk/miniprogramSdk');

App({
  globalData: {
    launchReady: false,
  },

  async onLaunch() {
    configureRuntime();
    initMiniprogramSdk();
    authStore.restore();

    try {
      if (authStore.getToken()) {
        await authStore.loadCurrentUser();
      }
    } catch (error) {
      // 启动阶段鉴权失败必须清理本地态，避免用户停留在过期会话中。
      authStore.clear();
    } finally {
      this.globalData.launchReady = true;
    }
  },
});
