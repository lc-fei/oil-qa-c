import { Alert, Button, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '@oil-qa-c/business';
import { routes } from '@oil-qa-c/shared';
import './login.css';

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
    <div className="login-page">
      <div className="login-shell">
        <section className="login-panel login-hero">
          <div>
            <div className="login-brand">OG</div>
            <Typography.Title level={1} className="login-hero-title">
              油井工程智能问答系统
            </Typography.Title>
            <Typography.Paragraph className="login-hero-description">
              面向油井工程场景的专业问答入口。通过知识图谱与大模型协同，为用户提供可解释、可追溯、可持续追问的专业知识服务。
            </Typography.Paragraph>

            <div className="login-bullets">
              <div className="login-bullet">
                <strong>图谱增强问答</strong>
                <span>回答过程结合知识图谱检索结果，减少黑盒感。</span>
              </div>
              <div className="login-bullet">
                <strong>专业知识追溯</strong>
                <span>回答不仅返回文本，还可查看命中实体、关系链和依据摘要。</span>
              </div>
              <div className="login-bullet">
                <strong>面向监控闭环</strong>
                <span>问答行为可为管理端运行监控和异常分析提供真实数据来源。</span>
              </div>
            </div>
          </div>

          <Typography.Paragraph className="login-footer-note">
            PC Web 原型 · 毕业设计用户端
          </Typography.Paragraph>
        </section>

        <section className="login-panel login-form-panel">
          <Typography.Title level={2} className="login-form-title">
            登录
          </Typography.Title>
          <Typography.Paragraph className="login-form-subtitle">
            请输入账号信息后进入系统。
          </Typography.Paragraph>

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
            className="login-form"
          >
            <Form.Item
              label="用户名"
              name="account"
              rules={[{ required: true, message: '请输入账号' }]}
              className="login-form-item"
            >
              <Input placeholder="请输入账号" size="large" className="login-input" />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
              className="login-form-item"
            >
              <Input.Password placeholder="请输入密码" size="large" className="login-input" />
            </Form.Item>

            {errorMessage ? (
              <Alert
                type="error"
                showIcon
                message={errorMessage}
                className="login-error-alert"
              />
            ) : null}

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={submitting}
              block
              className="login-submit-button"
            >
              登录
            </Button>
          </Form>

          <Typography.Paragraph className="login-helper-text">
            登录成功后进入问答首页。支持后续接入统一账号体系和登录态校验。
          </Typography.Paragraph>
        </section>
      </div>
    </div>
  );
}
