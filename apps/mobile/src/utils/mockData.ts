import type { FavoriteItemSummary, QaMessage, QaSessionSummary } from '@oil-qa-c/shared';

export const mockSessions: QaSessionSummary[] = [
  {
    sessionId: 1,
    sessionNo: 'SES_MOBILE_001',
    title: '井壁失稳的主要影响因素有哪些',
    lastQuestion: '井壁失稳通常由哪些因素引起？',
    messageCount: 6,
    updatedAt: '今天 14:20',
    isFavorite: true,
  },
  {
    sessionId: 2,
    sessionNo: 'SES_MOBILE_002',
    title: '钻井液密度与井喷风险关系',
    lastQuestion: '钻井液密度过低为什么容易引发井喷风险？',
    messageCount: 4,
    updatedAt: '今天 10:42',
    isFavorite: false,
  },
  {
    sessionId: 3,
    sessionNo: 'SES_MOBILE_003',
    title: '井漏处理的一般技术路径',
    lastQuestion: '发生井漏后一般有哪些处理步骤？',
    messageCount: 8,
    updatedAt: '昨天',
    isFavorite: false,
  },
];

export const mockMessages: QaMessage[] = [
  {
    messageId: 1,
    messageNo: 'MSG_MOBILE_001',
    requestNo: 'REQ_MOBILE_001',
    question: '井壁失稳通常由哪些因素引起？如果是在深井和高压地层条件下，会有什么不同？',
    answer:
      '井壁失稳通常与地层力学性质、钻井液性能、井眼轨迹、地层压力差以及施工参数控制有关。深井高压条件下，安全密度窗口更窄，压差敏感性更强。',
    status: 'SUCCESS',
    createdAt: '今天 14:20',
    favorite: false,
    feedbackType: null,
  },
];

export const mockFavorites: FavoriteItemSummary[] = [
  {
    favoriteId: 1,
    favoriteType: 'MESSAGE',
    sessionId: 1,
    messageId: 1,
    title: '井壁失稳的主要影响因素有哪些',
    createdAt: '今天 14:28',
  },
  {
    favoriteId: 2,
    favoriteType: 'MESSAGE',
    sessionId: 3,
    messageId: 8,
    title: '井漏处理的一般技术路径',
    createdAt: '昨天 19:08',
  },
];
