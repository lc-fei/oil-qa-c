import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, favoriteService, qaChatService, qaSessionService, recommendationService } from '@oil-qa-c/business';
import { copyToClipboard, type EvidenceDetail, type QaMessage, type QaSessionSummary, type RecommendationItem, routes } from '@oil-qa-c/shared';
import { createSessionDomainState } from '@oil-qa-c/wasm-sdk';
import { useAuthStore, useChatStore, useEvidenceStore, useFavoriteStore, useSessionStore } from '@oil-qa-c/store';
import { AnswerRenderer } from '@oil-qa-c/ui';
import './chat.css';

interface SessionGroup {
  label: string;
  items: QaSessionSummary[];
}

const DEFAULT_COMPOSER_TEXT = '井壁失稳通常由哪些因素引起？';

const DEMO_RECOMMENDATIONS: RecommendationItem[] = [
  { id: 1, questionText: '什么是井壁失稳？', questionType: '概念解释类问题', sortNo: 1 },
  { id: 2, questionText: '钻井液密度过高会带来哪些风险？', questionType: '参数影响类问题', sortNo: 2 },
  { id: 3, questionText: '发生井漏时一般怎么处理？', questionType: '工艺步骤类问题', sortNo: 3 },
  { id: 4, questionText: '深井条件下卡钻机理有什么差异？', questionType: '多轮追问类问题', sortNo: 4 },
];

function formatDayLabel(dateText: string) {
  const target = new Date(dateText);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const compare = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diffDays = Math.floor((today.getTime() - compare.getTime()) / 86_400_000);

  if (diffDays <= 0) {
    return '今天';
  }

  if (diffDays === 1) {
    return '昨天';
  }

  if (diffDays <= 7) {
    return '近 7 天';
  }

  return '更早';
}

function groupSessionsByDate(sessions: QaSessionSummary[]): SessionGroup[] {
  const grouped = [...sessions]
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .reduce<Record<string, QaSessionSummary[]>>((accumulator, session) => {
      const label = formatDayLabel(session.updatedAt);
      accumulator[label] = accumulator[label] ?? [];
      accumulator[label].push(session);
      return accumulator;
    }, {});

  return ['今天', '昨天', '近 7 天', '更早']
    .map((label) => ({
      label,
      items: grouped[label] ?? [],
    }))
    .filter((group) => group.items.length > 0);
}

function formatSessionMeta(session: QaSessionSummary) {
  const target = new Date(session.updatedAt);
  const timeText = target.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const prefix = formatDayLabel(session.updatedAt) === '今天' ? `今天 ${timeText}` : formatDayLabel(session.updatedAt);
  const favoriteText = session.isFavorite ? '含收藏消息' : '图谱增强问答';
  return `${prefix} · ${favoriteText} · ${session.messageCount} 条消息`;
}

function buildUserInitials(name: string) {
  return name
    .trim()
    .slice(0, 2)
    .toUpperCase();
}

function formatDurationLabel(durationMs: number) {
  if (durationMs < 1000) {
    return `${durationMs} ms`;
  }

  return `${(durationMs / 1000).toFixed(2)} s`;
}

export function ChatPage() {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const currentUser = useAuthStore((state) => state.currentUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const sessions = useSessionStore((state) => state.sessions);
  const currentSessionId = useSessionStore((state) => state.currentSessionId);
  const setSessions = useSessionStore((state) => state.setSessions);
  const setSessionDomainState = useSessionStore((state) => state.setDomainState);
  const messages = useChatStore((state) => state.messages);
  const isSending = useChatStore((state) => state.isSending);
  const setSending = useChatStore((state) => state.setSending);
  const setChatDomainState = useChatStore((state) => state.setDomainState);
  const favoriteIdsByMessageId = useFavoriteStore((state) => state.favoriteIdsByMessageId);
  const evidenceOpen = useEvidenceStore((state) => state.panelOpen);
  const currentEvidenceMessageId = useEvidenceStore((state) => state.currentMessageId);
  const evidenceDetail = useEvidenceStore((state) => state.detail);
  const openEvidencePanel = useEvidenceStore((state) => state.openPanel);
  const closeEvidencePanel = useEvidenceStore((state) => state.closePanel);
  const setEvidenceDetail = useEvidenceStore((state) => state.setDetail);

  const [composerValue, setComposerValue] = useState(DEFAULT_COMPOSER_TEXT);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>(DEMO_RECOMMENDATIONS);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingRecommendations, setLoadingRecommendations] = useState(true);
  const [sessionErrorMessage, setSessionErrorMessage] = useState('');
  const [evidenceErrorMessage, setEvidenceErrorMessage] = useState('');
  const [loadingEvidence, setLoadingEvidence] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [favoriteActionMessageId, setFavoriteActionMessageId] = useState<number | null>(null);

  const groupedSessions = useMemo(() => groupSessionsByDate(sessions), [sessions]);
  const hasConversation = Boolean(currentSessionId && messages.length);
  const layoutClassName = evidenceOpen && hasConversation ? 'chat-shell chat-shell--with-evidence' : 'chat-shell';
  const userDisplayName = currentUser?.nickname ?? currentUser?.username ?? '访客';
  const userRoleText = currentUser?.roles.join(' / ') || 'CLIENT_USER';

  useEffect(() => {
    // 页面不重新定义消息领域规则，仍然只持有 SDK 输出的快照。
    void qaChatService.buildChatDomainState(messages).then((state) => {
      setChatDomainState(state);
    });
  }, [messages, setChatDomainState]);

  useEffect(() => {
    // 会话列表变化后同步刷新领域快照，保证页面展示与 SDK 内会话状态一致。
    void createSessionDomainState(sessions, currentSessionId).then((state) => {
      setSessionDomainState(state);
    });
  }, [currentSessionId, sessions, setSessionDomainState]);

  useEffect(() => {
    if (!isAuthenticated) {
      // 未完成认证前不触发会话接口，避免启动阶段产生无意义的 401。
      setLoadingSessions(false);
      return;
    }

    async function bootstrapSessions() {
      setLoadingSessions(true);
      setSessionErrorMessage('');

      try {
      await qaSessionService.bootstrap({ pageNum: 1, pageSize: 20 });
      } catch (error) {
        setSessionErrorMessage(error instanceof Error ? error.message : '会话接口加载失败');
      } finally {
        setLoadingSessions(false);
      }
    }

    async function bootstrapRecommendations() {
      setLoadingRecommendations(true);

      try {
        const response = await recommendationService.list();
        setRecommendations(response.list?.length ? response.list : DEMO_RECOMMENDATIONS);
      } catch {
        setRecommendations(DEMO_RECOMMENDATIONS);
      } finally {
        setLoadingRecommendations(false);
      }
    }

    void bootstrapSessions();
    void bootstrapRecommendations();
  }, [isAuthenticated]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    await authService.logout();
    navigate(routes.login, { replace: true });
  }

  async function selectSession(sessionId: number) {
    try {
      setSessionErrorMessage('');
      await qaSessionService.select(sessionId);
      closeEvidencePanel();
    } catch (error) {
      setSessionErrorMessage(error instanceof Error ? error.message : '会话详情加载失败');
    }
  }

  async function createNewSession() {
    try {
      setSessionErrorMessage('');
      await qaSessionService.createAndSelect('新对话');
      setComposerValue('');
      closeEvidencePanel();
    } catch (error) {
      setSessionErrorMessage(error instanceof Error ? error.message : '新建会话失败');
    }
  }

  async function handleRenameSession(sessionId: number) {
    const targetSession = sessions.find((session) => session.sessionId === sessionId);
    const nextTitle = window.prompt('请输入新的会话标题', targetSession?.title ?? '');

    if (!nextTitle?.trim()) {
      return;
    }

    try {
      setSessionErrorMessage('');
      await qaSessionService.rename(sessionId, nextTitle.trim());
    } catch (error) {
      setSessionErrorMessage(error instanceof Error ? error.message : '重命名失败');
    }
  }

  async function handleDeleteSession(sessionId: number) {
    try {
      setSessionErrorMessage('');
      await qaSessionService.delete(sessionId);
      closeEvidencePanel();
    } catch (error) {
      setSessionErrorMessage(error instanceof Error ? error.message : '删除会话失败');
    }
  }

  function handleToggleEvidence(message: QaMessage) {
    if (currentEvidenceMessageId === message.messageId && evidenceOpen) {
      closeEvidencePanel();
      return;
    }

    openEvidencePanel(message.messageId);
    setEvidenceErrorMessage('');
    setLoadingEvidence(true);
    setEvidenceDetail(null);
    void qaChatService
      .getEvidence(message.messageId)
      .catch((error) => {
        setEvidenceErrorMessage(error instanceof Error ? error.message : '依据加载失败');
      })
      .finally(() => {
        setLoadingEvidence(false);
      });
  }

  function handleUseRecommendation(question: string) {
    setComposerValue(question);
  }

  async function handleSubmitQuestion() {
    const question = composerValue.trim();

    if (!question || isSending) {
      return;
    }

    setSending(true);
    setSessionErrorMessage('');

    try {
      await qaChatService.sendQuestion({
        sessionId: currentSessionId ?? undefined,
        question,
        contextMode: 'ON',
        answerMode: 'GRAPH_ENHANCED',
      });
      setComposerValue('');
    } catch (error) {
      setSessionErrorMessage(error instanceof Error ? error.message : '问答发送失败');
    } finally {
      setSending(false);
    }
  }

  async function handleToggleFavorite(message: QaMessage) {
    setFavoriteActionMessageId(message.messageId);

    try {
      setSessionErrorMessage('');
      await favoriteService.toggleMessageFavorite(message.messageId);
    } catch (error) {
      setSessionErrorMessage(error instanceof Error ? error.message : '收藏操作失败');
    } finally {
      setFavoriteActionMessageId(null);
    }
  }

  return (
    <div className="chat-page">
      <div className={layoutClassName}>
        <aside className="chat-panel chat-sidebar">
          <div className="chat-brand">
            <strong>油井工程智能问答</strong>
            <span>Knowledge Graph Enhanced QA</span>
          </div>

          <button type="button" className="chat-primary-button" onClick={() => void createNewSession()}>
            + 新建对话
          </button>

          <div className="chat-sidebar-header">
            <span className="chat-group-title">历史会话</span>
            {loadingSessions ? <span className="chat-inline-note">加载中</span> : null}
          </div>

          {sessionErrorMessage ? <div className="chat-inline-alert">{sessionErrorMessage}</div> : null}

          <div className="chat-session-wrap">
            {groupedSessions.length > 0 ? (
              groupedSessions.map((group) => (
                <section key={group.label}>
                  <div className="chat-group-title">{group.label}</div>
                  {group.items.map((session) => (
                    <button
                      key={session.sessionId}
                      type="button"
                      className={`chat-session-card ${session.sessionId === currentSessionId ? 'is-active' : ''}`}
                      onClick={() => {
                        void selectSession(session.sessionId);
                      }}
                    >
                      <div className="chat-session-main">
                        <strong>{session.title}</strong>
                        <span>{formatSessionMeta(session)}</span>
                      </div>
                      <div className="chat-session-actions">
                        {session.isFavorite ? <span className="chat-session-badge">含收藏消息</span> : null}
                        <span
                          role="button"
                          tabIndex={0}
                          className="chat-session-action"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleRenameSession(session.sessionId);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              void handleRenameSession(session.sessionId);
                            }
                          }}
                        >
                          重命名
                        </span>
                        <span
                          role="button"
                          tabIndex={0}
                          className="chat-session-action is-danger"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDeleteSession(session.sessionId);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              void handleDeleteSession(session.sessionId);
                            }
                          }}
                        >
                          删除
                        </span>
                      </div>
                    </button>
                  ))}
                </section>
              ))
            ) : (
              <div className="chat-empty-sidebar">暂无历史会话，点击上方“新建对话”即可开始一轮新的专业问答。</div>
            )}
          </div>

          <div className="chat-user-footer" ref={dropdownRef}>
            {userMenuOpen ? (
              <div className="chat-user-dropdown">
                <button
                  type="button"
                  className="chat-user-dropdown-item"
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate(routes.favorites);
                  }}
                >
                  我的收藏
                </button>
                <button
                  type="button"
                  className="chat-user-dropdown-item"
                  onClick={() => {
                    void handleLogout();
                  }}
                >
                  退出登录
                </button>
              </div>
            ) : null}

            <button
              type="button"
              className="chat-user-trigger"
              onClick={() => {
                setUserMenuOpen((value) => !value);
              }}
            >
              <div className="chat-user-avatar">{buildUserInitials(userDisplayName)}</div>
              <div className="chat-user-text">
                <strong>{userDisplayName}</strong>
                <span>{userRoleText}</span>
              </div>
            </button>
          </div>
        </aside>

        <main className="chat-panel chat-main">
          <header className="chat-main-header">
            <div>
              <h1>{hasConversation ? '油井工程知识问答工作台' : '油井工程知识问答首页'}</h1>
              <p>
                {hasConversation
                  ? '会话态下展示多轮问答、回答操作区和右侧知识依据联动。'
                  : '空状态下只展示系统能力、推荐问题和快捷起问入口，不展示知识依据面板。'}
              </p>
            </div>
            {hasConversation ? (
              <div className="chat-header-pills">
                <span className="chat-pill">图谱增强已开启</span>
                <span className="chat-pill">上下文 {messages.length} 轮</span>
                <span className="chat-pill">回答模式：专业解释</span>
              </div>
            ) : null}
          </header>

          {!hasConversation ? (
            <div className="chat-main-content">
              <section className="chat-hero-card">
                <h2>从专业问题开始，而不是从空白页面开始。</h2>
                <p>系统会结合知识图谱与问答模型，为你的问题返回更可解释的专业回答。</p>
                <div className="chat-recommend-grid">
                  {(loadingRecommendations ? DEMO_RECOMMENDATIONS : recommendations).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="chat-recommend-card"
                      onClick={() => {
                        handleUseRecommendation(item.questionText);
                      }}
                    >
                      <strong>{item.questionText}</strong>
                      <span>{item.questionType}</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="chat-message-list">
              {messages.map((message) => (
                <div key={message.messageId} className="chat-message-block">
                  <div className="chat-message-row">
                    <div className="chat-bubble-avatar is-user">U</div>
                    <div className="chat-bubble is-user">
                      <h3>用户问题</h3>
                      <div>{message.question}</div>
                      <div className="chat-chip-row">
                        <span className="chat-chip">问题类型：专业问答</span>
                        <span className="chat-chip">上下文模式：开启</span>
                      </div>
                    </div>
                  </div>

                  <div className="chat-message-row">
                    <div className="chat-bubble-avatar is-ai">AI</div>
                    <div className="chat-bubble">
                      <h3>系统回答</h3>
                      {/* 主会话回答统一走富文本渲染组件，避免页面自己解析模型返回格式。 */}
                      <AnswerRenderer content={message.answer} className="chat-answer-renderer" />
                      <div className="chat-chip-row">
                        <span className="chat-chip">{message.answerSummary}</span>
                        {message.favorite ? <span className="chat-chip">已收藏</span> : null}
                      </div>
                      <div className="chat-action-row">
                        <button
                          type="button"
                          className="chat-inline-button"
                          onClick={() => {
                            void handleToggleFavorite(message);
                          }}
                          disabled={favoriteActionMessageId === message.messageId}
                        >
                          {favoriteActionMessageId === message.messageId
                            ? '处理中...'
                            : message.favorite || favoriteIdsByMessageId[message.messageId]
                              ? '取消收藏'
                              : '收藏回答'}
                        </button>
                        <button
                          type="button"
                          className="chat-inline-button"
                          onClick={() => {
                            handleToggleEvidence(message);
                          }}
                        >
                          {currentEvidenceMessageId === message.messageId && evidenceOpen ? '收起依据' : '查看依据'}
                        </button>
                        <button
                          type="button"
                          className="chat-inline-button"
                          onClick={() => {
                            void copyToClipboard(message.answer);
                          }}
                        >
                          复制回答
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <footer className="chat-composer">
            <div className="chat-composer-box">
              <textarea
                value={composerValue}
                placeholder="输入你的油井工程问题"
                onChange={(event) => {
                  setComposerValue(event.target.value);
                }}
              />
              <div className="chat-composer-row">
                <div className="chat-chip-row">
                  <span className="chat-chip">图谱增强问答</span>
                  <span className="chat-chip">保留上下文</span>
                  <span className="chat-chip">优先显示依据</span>
                </div>
                <button
                  type="button"
                  className="chat-primary-button chat-send-button"
                  disabled={isSending}
                  onClick={() => {
                    void handleSubmitQuestion();
                  }}
                >
                  {isSending ? '发送中...' : '发送问题'}
                </button>
              </div>
            </div>
          </footer>
        </main>

        {evidenceOpen && hasConversation ? (
          <aside className="chat-panel chat-evidence-panel">
            <div className="chat-evidence-header">
              <div>
                <strong>知识依据</strong>
                <span>当前基于“查看依据”动作展开，展示本轮回答的知识图谱命中与依据摘要。</span>
              </div>
              <button type="button" className="chat-inline-button" onClick={closeEvidencePanel}>
                关闭
              </button>
            </div>

            {evidenceDetail ? (
              <div className="chat-evidence-content">
                <section className="chat-evidence-card">
                  <h3>图谱缩略图</h3>
                  <div className="chat-chip-row">
                    <span className="chat-chip">
                      {evidenceDetail.graphData.center
                        ? `中心实体：${evidenceDetail.graphData.center.entityName} · ${evidenceDetail.graphData.center.entityType}`
                        : '中心实体：未命中'}
                    </span>
                    <span className="chat-chip">节点数：{evidenceDetail.graphData.nodes.length}</span>
                    <span className="chat-chip">边数：{evidenceDetail.graphData.edges.length}</span>
                  </div>
                  <div className="chat-evidence-grid">
                    {evidenceDetail.graphData.nodes.length > 0 ? (
                      evidenceDetail.graphData.nodes.map((node) => (
                        <div key={node.id} className="chat-evidence-mini-card">
                          <strong>{node.name || node.entityName}</strong>
                          <span>{node.entityType ?? node.typeName ?? '未分类'}</span>
                        </div>
                      ))
                    ) : (
                      <div className="chat-evidence-text">暂无图谱节点。</div>
                    )}
                  </div>
                </section>

                <section className="chat-evidence-card">
                  <h3>命中实体</h3>
                  <div className="chat-chip-row">
                    {evidenceDetail.entities.length > 0 ? (
                      evidenceDetail.entities.map((entity) => (
                        <span key={entity.entityId} className="chat-chip">
                          {entity.entityName} · {entity.entityType}
                        </span>
                      ))
                    ) : (
                      <span className="chat-chip">未命中实体</span>
                    )}
                  </div>
                </section>

                <section className="chat-evidence-card">
                  <h3>关系链</h3>
                  {evidenceDetail.relations.length > 0 ? (
                    evidenceDetail.relations.map((relation) => (
                      <div key={`${relation.sourceName}-${relation.targetName}`} className="chat-evidence-text">
                        {relation.sourceName} {relation.relationType} {relation.targetName}
                      </div>
                    ))
                  ) : (
                    <div className="chat-evidence-text">未命中关系链。</div>
                  )}
                </section>

                <section className="chat-evidence-card">
                  <h3>知识摘要</h3>
                  {evidenceDetail.sources.length > 0 ? (
                    evidenceDetail.sources.map((source) => (
                      <div key={`${source.sourceType}-${source.title}`} className="chat-evidence-source">
                        <strong>{source.title}</strong>
                        {/* 依据内容可能包含换行和 Markdown 片段，统一交给富文本渲染器处理。 */}
                        <AnswerRenderer content={source.content} compact />
                      </div>
                    ))
                  ) : (
                    <div className="chat-evidence-text">暂无依据卡片。</div>
                  )}
                </section>

                <section className="chat-evidence-card">
                  <h3>阶段耗时</h3>
                  <div className="chat-evidence-grid">
                    <div className="chat-evidence-mini-card">
                      <strong>总耗时</strong>
                      <span>{formatDurationLabel(evidenceDetail.timings.totalDurationMs)}</span>
                    </div>
                    <div className="chat-evidence-mini-card">
                      <strong>NLP</strong>
                      <span>{formatDurationLabel(evidenceDetail.timings.nlpDurationMs)}</span>
                    </div>
                    <div className="chat-evidence-mini-card">
                      <strong>图谱检索</strong>
                      <span>{formatDurationLabel(evidenceDetail.timings.graphDurationMs)}</span>
                    </div>
                    <div className="chat-evidence-mini-card">
                      <strong>Prompt 组装</strong>
                      <span>{formatDurationLabel(evidenceDetail.timings.promptDurationMs)}</span>
                    </div>
                    <div className="chat-evidence-mini-card">
                      <strong>AI 调用</strong>
                      <span>{formatDurationLabel(evidenceDetail.timings.aiDurationMs)}</span>
                    </div>
                  </div>
                </section>

                <section className="chat-evidence-card">
                  <h3>置信度</h3>
                  <div className="chat-evidence-text">{Math.round(evidenceDetail.confidence * 100)}%</div>
                </section>
              </div>
            ) : (
              <div className="chat-empty-sidebar">
                {loadingEvidence ? '正在加载知识依据...' : evidenceErrorMessage || '暂无依据内容。'}
              </div>
            )}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
