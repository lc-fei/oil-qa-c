import { Card, List, Typography } from 'antd';
import { PageContainer } from '@oil-qa-c/ui';
import { useFavoriteStore } from '@oil-qa-c/store';

export function FavoritesPage() {
  const favorites = useFavoriteStore((state) => state.items);

  return (
    <PageContainer
      title="我的收藏"
      subtitle="当前保留收藏列表与筛选状态的接入位，后续再补检索、跳转与取消收藏。"
    >
      <Card>
        <List
          locale={{ emptyText: '暂无收藏，后续在此接入收藏查询接口。' }}
          dataSource={favorites}
          renderItem={(item) => (
            <List.Item key={item.favoriteId}>
              <Typography.Text>{item.title}</Typography.Text>
            </List.Item>
          )}
        />
      </Card>
    </PageContainer>
  );
}
