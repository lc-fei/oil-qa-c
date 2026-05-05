import type { EvidenceDetail, FavoriteItemDetail, QaMessage, QaSessionSummary } from '@oil-qa-c/shared';

export type RootStackParamList = {
  Login: undefined;
  Sessions: undefined;
  Chat: {
    sessionId?: number;
    title?: string;
  };
  Evidence: {
    messageId: number;
    detail?: EvidenceDetail;
  };
  Favorites: undefined;
  FavoriteDetail: {
    favoriteId: number;
    detail?: FavoriteItemDetail;
  };
  Profile: undefined;
};

export interface MobileSession extends QaSessionSummary {}

export interface MobileMessage extends QaMessage {}
