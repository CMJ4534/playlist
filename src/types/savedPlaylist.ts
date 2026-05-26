import type { EmotionId } from '@/types/emotion';
import type { PlaylistHistoryTrack } from '@/types/listeningActivity';

/** 향후 public playlist · 친구 공유 · 감정 피드 확장용 */
export type PlaylistVisibility = 'private' | 'unlisted' | 'public';

export type SavedPlaylistMeta = {
  visibility: PlaylistVisibility;
  /** 서버 연동 시 public URL slug */
  shareSlug: string | null;
  /** 소셜 피드·친구 공유용 (미연동) */
  ownerUserId: string | null;
  feedPostId: string | null;
};

export type SavedPlaylistRecord = {
  id: string;
  emotionId: EmotionId;
  title: string;
  description: string;
  tracks: PlaylistHistoryTrack[];
  savedAt: number;
  createdAt: number;
  sourcePlaylistHistoryId?: string;
  replayCount: number;
  meta: SavedPlaylistMeta;
};

export type SavePlaylistInput = {
  emotionId: EmotionId;
  title: string;
  description: string;
  tracks: PlaylistHistoryTrack[];
  sourcePlaylistHistoryId?: string;
  meta?: Partial<SavedPlaylistMeta>;
};
