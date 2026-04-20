import { Button, Card, Col, List, Row, Space, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { authService } from '@oil-qa-c/business';
import { PageContainer } from '@oil-qa-c/ui';
import { routes } from '@oil-qa-c/shared';
import { useAppStore, useAuthStore, useChatStore, useEvidenceStore, useSessionStore } from '@oil-qa-c/store';

export function ChatPage() {
  const navigate = useNavigate();
  const appStatus = useAppStore((state) => state.status);
  const currentUser = useAuthStore((state) => state.currentUser);
  const currentSessionId = useSessionStore((state) => state.currentSessionId);
  const messages = useChatStore((state) => state.messages);
  const evidenceOpen = useEvidenceStore((state) => state.panelOpen);

  async function handleLogout() {
    await authService.logout();
    navigate(routes.login, { replace: true });
  }

  return (
    <PageContainer
      title="问答首页"
      subtitle="当前只搭好空状态、会话区和依据面板的结构边界，后续会补真实交互。"
    >
      <Row gutter={16}>
        <Col span={6}>
          <Card title="历史会话">
            <Space direction="vertical">
              <Typography.Text type="secondary">状态：{appStatus}</Typography.Text>
              <Typography.Text type="secondary">
                当前用户：{currentUser?.nickname ?? currentUser?.username ?? '未登录'}
              </Typography.Text>
              <Typography.Text type="secondary">
                当前会话：{currentSessionId ?? '暂无'}
              </Typography.Text>
              <Tag color="default">路由：{routes.chat}</Tag>
              <Button onClick={() => void handleLogout()}>退出登录</Button>
            </Space>
          </Card>
        </Col>
        <Col span={evidenceOpen ? 12 : 18}>
          <Card title="消息流">
            <List
              locale={{ emptyText: '暂无消息，后续在此接入问答输入框与消息流。' }}
              dataSource={messages}
              renderItem={(message) => (
                <List.Item key={message.messageId}>
                  <Space direction="vertical" size={0}>
                    <Typography.Text strong>{message.question}</Typography.Text>
                    <Typography.Text type="secondary">{message.answer}</Typography.Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        {evidenceOpen ? (
          <Col span={6}>
            <Card title="知识依据面板">
              <Typography.Text type="secondary">
                依据详情后续由 evidence 接口与 wasm 适配层共同驱动。
              </Typography.Text>
            </Card>
          </Col>
        ) : null}
      </Row>
    </PageContainer>
  );
}
