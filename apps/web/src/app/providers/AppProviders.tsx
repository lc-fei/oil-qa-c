import { Spin } from 'antd';
import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';
import { authService } from '@oil-qa-c/business';
import { useAppStore } from '@oil-qa-c/store';
import { initializeWebApp } from '../bootstrap/initializeWebApp';

export function AppProviders({ children }: PropsWithChildren) {
  const status = useAppStore((state) => state.status);
  const setStatus = useAppStore((state) => state.setStatus);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAuth() {
      setStatus('bootstrapping');

      try {
        // 启动时先完成 Web 端 transport / storage / wasm 初始化，再恢复登录态。
        await initializeWebApp();
        await authService.restoreSession();

        if (!cancelled) {
          setStatus('ready');
        }
      } catch (error) {
        console.error('restore session failed', error);

        // 初始化失败不能让整站卡死，页面进入 ready 后由登录态决定跳转。
        if (!cancelled) {
          setStatus('ready');
        }
      }
    }

    void bootstrapAuth();

    return () => {
      // React 严格模式会触发 effect 清理，避免过期异步回写全局启动状态。
      cancelled = true;
    };
  }, [setStatus]);

  if (status === 'bootstrapping') {
    return <Spin fullscreen tip="正在恢复登录状态..." />;
  }

  return children;
}
