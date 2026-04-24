import { useEffect, useState } from 'react';
import { Button, Card, Input, List, Space, Typography } from 'antd';
import { favoriteService } from '@oil-qa-c/business';
import { useFavoriteStore } from '@oil-qa-c/store';
import { AnswerRenderer, PageContainer } from '@oil-qa-c/ui';

export function FavoritesPage() {
  const favorites = useFavoriteStore((state) => state.items);
  const keyword = useFavoriteStore((state) => state.keyword);
  const total = useFavoriteStore((state) => state.total);
  const setKeyword = useFavoriteStore((state) => state.setKeyword);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function loadFavorites(nextKeyword = keyword) {
    setLoading(true);
    setErrorMessage('');

    try {
      await favoriteService.list({
        keyword: nextKeyword.trim() || undefined,
        favoriteType: 'MESSAGE',
        pageNum: 1,
        pageSize: 20,
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '收藏列表加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFavorites();
    // 收藏页首屏需要真实查询，不能继续停留在占位态。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRemoveFavorite(favoriteId: number, messageId: number) {
    setLoading(true);
    setErrorMessage('');

    try {
      await favoriteService.cancelFavorite(favoriteId, messageId);
      await loadFavorites(keyword);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '取消收藏失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer title="我的收藏" subtitle={`当前共 ${total} 条收藏消息，可按关键词检索与取消收藏。`}>
      <Card>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={keyword}
              placeholder="输入问题关键词检索收藏"
              onChange={(event) => {
                setKeyword(event.target.value);
              }}
              onPressEnter={() => {
                void loadFavorites();
              }}
            />
            <Button
              type="primary"
              loading={loading}
              onClick={() => {
                void loadFavorites();
              }}
            >
              搜索
            </Button>
          </Space.Compact>

          {errorMessage ? <Typography.Text type="danger">{errorMessage}</Typography.Text> : null}

          <List
            loading={loading}
            locale={{ emptyText: '暂无收藏消息。' }}
            dataSource={favorites}
            renderItem={(item) => (
              <List.Item
                key={item.favoriteId}
                actions={[
                  <Button
                    key="remove"
                    type="link"
                    danger
                    onClick={() => {
                      void handleRemoveFavorite(item.favoriteId, item.messageId);
                    }}
                  >
                    取消收藏
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={item.title}
                  description={
                    <Space direction="vertical" size={4}>
                      <Typography.Text type="secondary">问题：{item.question}</Typography.Text>
                      {/* 收藏页也复用统一渲染器，保证摘要中的列表/强调格式不被直接打平。 */}
                      <AnswerRenderer content={item.answerSnippet} compact />
                      <Typography.Text type="secondary">收藏时间：{item.createdAt}</Typography.Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Space>
      </Card>
    </PageContainer>
  );
}
