import { Spin } from 'antd';
import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';
import { authService } from '@oil-qa-c/business';
import { useAppStore } from '@oil-qa-c/store';
import { initializeWebApp } from '../bootstrap/initializeWebApp';

// 统一承载应用级初始化，避免页面层直接感知底层能力。
initializeWebApp();

export function AppProviders({ children }: PropsWithChildren) {
  const status = useAppStore((state) => state.status);
  const setStatus = useAppStore((state) => state.setStatus);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAuth() {
      setStatus('bootstrapping');

      try {
        await authService.restoreSession();

        if (!cancelled) {
          setStatus('ready');
        }
      } catch (error) {
        console.error('restore session failed', error);

        if (!cancelled) {
          setStatus('ready');
        }
      }
    }

    void bootstrapAuth();

    return () => {
      cancelled = true;
    };
  }, [setStatus]);

  if (status === 'bootstrapping') {
    return <Spin fullscreen tip="正在恢复登录状态..." />;
  }

  return children;
}
