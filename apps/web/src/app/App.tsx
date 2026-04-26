import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AppProviders } from './providers/AppProviders';
import { AppRouter } from './router/AppRouter';

export function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          // 统一主色与圆角，保证 Ant Design 基础组件贴合当前油井问答视觉方案。
          colorPrimary: '#0f766e',
          borderRadius: 12,
        },
      }}
    >
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </ConfigProvider>
  );
}
