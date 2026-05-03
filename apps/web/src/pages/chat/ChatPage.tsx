import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
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
  // 只按自然日分组，不使用精确小时差，避免午夜前后的会话被误分组。
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
  // 左侧历史会话按更新时间倒序展示，再映射到固定分组顺序。
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
  // 会话列表只展示消息收藏提示，不提供会话级收藏能力。
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

function formatWorkflowStatus(status: string) {
  const statusMap: Record<string, string> = {
    PROCESSING: '处理中',
    SUCCESS: '成功',
    FAILED: '失败',
    PARTIAL_SUCCESS: '部分成功',
    INTERRUPTED: '已中断',
    NEED_CLARIFICATION: '需澄清',
  };

  return statusMap[status] ?? status;
}

function formatStageAction(stageCode: string, stageName: string, status: string) {
  const processingMap: Record<string, string> = {
    QUESTION_UNDERSTANDING: '正在理解问题',
    PLANNING: '正在规划回答路径',
    RETRIEVAL: '正在检索知识图谱',
    GENERATION: '正在生成答案',
  };
  const successMap: Record<string, string> = {
    QUESTION_UNDERSTANDING: '问题理解完成',
    PLANNING: '回答路径规划完成',
    RETRIEVAL: '知识图谱检索完成',
    GENERATION: '答案生成完成',
  };

  if (status === 'PROCESSING') {
    return processingMap[stageCode] ?? `正在进行${stageName}`;
  }

  if (status === 'SUCCESS') {
    return successMap[stageCode] ?? `${stageName}完成`;
  }

  if (status === 'FAILED') {
    return `${stageName}失败`;
  }

  return `${stageName}：${formatWorkflowStatus(status)}`;
}

function getWorkflowHint(message: QaMessage) {
  const workflow = message.workflow;

  if (!workflow) {
    return null;
  }

  const currentStage = workflow.stages.find((stage) => stage.stageCode === workflow.currentStage);
  const latestStage = workflow.stages.at(-1);
  const latestToolCall = workflow.toolCalls.at(-1);
  const activeStage = currentStage ?? latestStage;

  // 头部状态只表达“系统正在做什么”，避免把完整编排明细塞进回答气泡。
  if (workflow.status === 'PROCESSING') {
    if (message.answer.trim() && activeStage?.stageCode !== 'GENERATION') {
      // 文本 chunk 已经返回时，用户感知上已经进入生成阶段；用于兼容后端阶段事件延迟。
      return '正在生成答案';
    }

    if (activeStage) {
      return formatStageAction(activeStage.stageCode, activeStage.stageName, activeStage.status);
    }

    if (latestToolCall?.status === 'PROCESSING') {
      return `正在执行${latestToolCall.toolLabel}`;
    }

    return '正在组织回答';
  }

  if (workflow.status === 'SUCCESS') {
    return null;
  }

  if (workflow.status === 'PARTIAL_SUCCESS') {
    return '回答部分生成完成';
  }

  if (workflow.status === 'INTERRUPTED') {
    return '回答已停止生成';
  }

  if (workflow.status === 'FAILED') {
    return activeStage?.errorMessage ?? latestToolCall?.errorMessage ?? '回答生成失败';
  }

  return formatWorkflowStatus(workflow.status);
}

function isAnswerMetaVisible(message: QaMessage) {
  // 操作区依赖最终 messageId 和依据归档，必须等 SDK 写入终态快照后再展示。
  const finishedStatuses: QaMessage['status'][] = ['SUCCESS', 'PARTIAL_SUCCESS'];
  return finishedStatuses.includes(message.status) && Boolean(message.answer.trim());
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
  // 首问流式开始时后端尚未返回真实 sessionId，但本地已有 PROCESSING 消息，应立即进入会话态。
  const hasConversation = messages.length > 0;
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
        // 会话首屏由 SDK 拉取列表与默认详情，页面只负责显示加载和错误状态。
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
        // 推荐问题不是主链路能力，接口异常时用本地兜底内容保证空状态可继续提问。
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
      // 切换会话时关闭依据面板，避免右侧仍展示上一条消息的依据。
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
      // 空标题不提交到后端，避免制造无意义的会话名。
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
      // 再次点击当前消息的依据按钮时切换为关闭态。
      closeEvidencePanel();
      return;
    }

    // 打开新依据前先清空旧详情，防止接口加载期间显示上一条回答的依据。
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
      // 空问题和重复发送都会破坏问答状态机，因此在页面层提前拦截。
      return;
    }

    setSending(true);
    setSessionErrorMessage('');
    // 用户触发发送后立即清空输入区，避免等待流式响应期间误以为问题尚未提交。
    setComposerValue('');

    try {
      // SSE 由客户端实时渲染，最终状态仍通过 SDK finish/fail/cancel 归并。
      await qaChatService.sendQuestionStream({
        sessionId: currentSessionId ?? undefined,
        question,
        contextMode: 'ON',
        answerMode: 'GRAPH_ENHANCED',
      });
    } catch (error) {
      setSessionErrorMessage(error instanceof Error ? error.message : '问答发送失败');
    } finally {
      setSending(false);
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    // Enter 作为发送快捷键，Shift+Enter 仍交给 textarea 处理换行。
    event.preventDefault();
    void handleSubmitQuestion();
  }

  function handleCancelQuestion() {
    // SSE 取消由客户端关闭连接触发，service 会进入 SDK cancel 节点归并部分回答。
    qaChatService.cancelActiveStream();
  }

  async function handleToggleFavorite(message: QaMessage) {
    setFavoriteActionMessageId(message.messageId);

    try {
      setSessionErrorMessage('');
      // 收藏切换需要处理“已有 favoriteId”和“历史消息缺失映射”两种情况，统一放在 service。
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
                      {getWorkflowHint(message) ? (
                        <div className="chat-workflow-strip">
                          <span className="chat-workflow-dot" />
                          <span>{getWorkflowHint(message)}</span>
                        </div>
                      ) : null}
                      {/* 主会话回答统一走富文本渲染组件，避免页面自己解析模型返回格式。 */}
                      <AnswerRenderer content={message.answer} className="chat-answer-renderer" />
                      {isAnswerMetaVisible(message) ? (
                        <>
                          <div className="chat-chip-row">
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
                        </>
                      ) : null}
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
                onKeyDown={handleComposerKeyDown}
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
                  onClick={() => {
                    if (isSending) {
                      handleCancelQuestion();
                    } else {
                      void handleSubmitQuestion();
                    }
                  }}
                >
                  {isSending ? '停止生成' : '发送问题'}
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
