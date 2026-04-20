import type { PropsWithChildren } from 'react';
import { Layout, Space, Typography } from 'antd';

interface PageContainerProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
}

export function PageContainer({ title, subtitle, children }: PageContainerProps) {
  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Layout.Content style={{ padding: '32px 40px' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Typography.Title level={2} style={{ marginBottom: 8 }}>
              {title}
            </Typography.Title>
            {subtitle ? <Typography.Paragraph type="secondary">{subtitle}</Typography.Paragraph> : null}
          </div>
          {children}
        </Space>
      </Layout.Content>
    </Layout>
  );
}
