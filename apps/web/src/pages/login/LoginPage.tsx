import { Alert, Button, Card, Form, Input, Space, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@oil-qa-c/business';
import { routes } from '@oil-qa-c/shared';
import { PageContainer } from '@oil-qa-c/ui';

export function LoginPage() {
  const [form] = Form.useForm<{ account: string; password: string }>();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(values: { account: string; password: string }) {
    setSubmitting(true);
    setErrorMessage('');

    try {
      await authService.login(values);
      navigate(routes.chat, { replace: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '登录失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContainer
      title="登录页"
      subtitle="登录成功后将自动保存 token，并恢复当前用户信息。"
    >
      <Card style={{ maxWidth: 520 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Typography.Text strong>系统名称</Typography.Text>
            <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
              基于知识图谱的油井工程智能问答系统
            </Typography.Paragraph>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              支持图谱增强问答、专业知识追溯与会话式检索。
            </Typography.Paragraph>
          </div>

          {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}

          <Form
            form={form}
            layout="vertical"
            autoComplete="off"
            initialValues={{
              // 本地联调阶段默认填入调试账号，减少重复输入成本。
              account: 'client',
              password: '123456',
            }}
            onFinish={(values) => {
              void handleSubmit(values);
            }}
          >
            <Form.Item
              label="账号"
              name="account"
              rules={[{ required: true, message: '请输入账号' }]}
            >
              <Input placeholder="请输入账号" size="large" />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="请输入密码" size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" loading={submitting} block>
              登录
            </Button>
          </Form>
        </Space>
      </Card>
    </PageContainer>
  );
}
