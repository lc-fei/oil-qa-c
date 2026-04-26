import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Collapse, Empty, Input, List, Space, Spin, Typography } from 'antd';
import { favoriteService, qaSessionService } from '@oil-qa-c/business';
import { useFavoriteStore } from '@oil-qa-c/store';
import { routes } from '@oil-qa-c/shared';
import { AnswerRenderer, PageContainer } from '@oil-qa-c/ui';

export function FavoritesPage() {
  const navigate = useNavigate();
  const favorites = useFavoriteStore((state) => state.items);
  const detailByFavoriteId = useFavoriteStore((state) => state.detailByFavoriteId);
  const keyword = useFavoriteStore((state) => state.keyword);
  const total = useFavoriteStore((state) => state.total);
  const setKeyword = useFavoriteStore((state) => state.setKeyword);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const [openingSessionId, setOpeningSessionId] = useState<number | null>(null);
  const [loadingDetailFavoriteId, setLoadingDetailFavoriteId] = useState<number | null>(null);

  async function loadFavorites(nextKeyword = keyword) {
    setLoading(true);
    setErrorMessage('');

    try {
      // 收藏列表只拉概览字段，完整问答内容在用户展开时再按 favoriteId 查询。
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
      // 取消收藏后重新拉列表，确保分页总数和当前行状态都与后端一致。
      await favoriteService.cancelFavorite(favoriteId, messageId);
      await loadFavorites(keyword);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '取消收藏失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenSession(sessionId: number) {
    setOpeningSessionId(sessionId);
    setErrorMessage('');

    try {
      // 收藏页跳转前先把目标会话详情放入 store，进入主会话页后能直接落在对应上下文。
      await qaSessionService.select(sessionId);
      navigate(routes.chat);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '会话打开失败');
    } finally {
      setOpeningSessionId(null);
    }
  }

  async function handleCollapseChange(keys: string | string[]) {
    // Ant Design Collapse 同时支持单 key 和 key 数组，这里统一转成字符串数组保存。
    const nextKeys = Array.isArray(keys) ? keys.map(String) : [String(keys)];
    const newlyOpenedKey = nextKeys.find((key) => !activeKeys.includes(key));
    setActiveKeys(nextKeys);

    if (!newlyOpenedKey) {
      // 收起面板时不需要请求详情。
      return;
    }

    const targetFavoriteId = Number(newlyOpenedKey);
    if (!targetFavoriteId || detailByFavoriteId[targetFavoriteId]) {
      // 已加载过的详情走 store 缓存，避免重复展开产生重复请求。
      return;
    }

    setLoadingDetailFavoriteId(targetFavoriteId);
    setErrorMessage('');

    try {
      // 收藏列表接口只保留概览字段，展开时再按 favoriteId 拉详情，降低列表查询压力。
      await favoriteService.getDetail(targetFavoriteId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '收藏详情加载失败');
    } finally {
      setLoadingDetailFavoriteId(null);
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
              <List.Item key={item.favoriteId} style={{ paddingInline: 0 }}>
                <Collapse
                  style={{ width: '100%' }}
                  activeKey={activeKeys}
                  onChange={(keys) => {
                    void handleCollapseChange(keys);
                  }}
                  items={[
                    {
                      key: String(item.favoriteId),
                      label: (
                        <Space direction="vertical" size={2}>
                          <Typography.Text strong>{item.title}</Typography.Text>
                          <Typography.Text type="secondary">
                            会话 #{item.sessionId} · 消息 #{item.messageId}
                          </Typography.Text>
                          <Typography.Text type="secondary">收藏时间：{item.createdAt}</Typography.Text>
                        </Space>
                      ),
                      extra: (
                        <Space
                          onClick={(event) => {
                            // 面板右上角按钮不应触发展开状态切换，因此统一阻止冒泡。
                            event.stopPropagation();
                          }}
                        >
                          <Button
                            type="link"
                            onClick={() => {
                              setActiveKeys((keys) =>
                                keys.includes(String(item.favoriteId))
                                  ? keys.filter((key) => key !== String(item.favoriteId))
                                  : [...keys, String(item.favoriteId)],
                              );
                            }}
                          >
                            {activeKeys.includes(String(item.favoriteId)) ? '收起' : '展开'}
                          </Button>
                          <Button
                            type="link"
                            loading={openingSessionId === item.sessionId}
                            onClick={() => {
                              void handleOpenSession(item.sessionId);
                            }}
                          >
                            查看原会话
                          </Button>
                          <Button
                            type="link"
                            danger
                            onClick={() => {
                              void handleRemoveFavorite(item.favoriteId, item.messageId);
                            }}
                          >
                            取消收藏
                          </Button>
                        </Space>
                      ),
                      children: (
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                          {loadingDetailFavoriteId === item.favoriteId && !detailByFavoriteId[item.favoriteId] ? (
                            <div style={{ padding: '8px 0' }}>
                              <Spin size="small" /> <Typography.Text type="secondary">正在加载收藏详情...</Typography.Text>
                            </div>
                          ) : detailByFavoriteId[item.favoriteId] ? (
                            <>
                              <Typography.Text type="secondary">
                                问题：{detailByFavoriteId[item.favoriteId].question}
                              </Typography.Text>
                              <div>
                                <Typography.Text type="secondary">回答内容</Typography.Text>
                                <div style={{ marginTop: 8 }}>
                                  <AnswerRenderer content={detailByFavoriteId[item.favoriteId].answer} />
                                </div>
                              </div>
                            </>
                          ) : (
                            <Empty
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                              description="展开后未获取到收藏详情，请重试。"
                            />
                          )}
                        </Space>
                      ),
                    },
                  ]}
                />
              </List.Item>
            )}
          />
        </Space>
      </Card>
    </PageContainer>
  );
}
