import type { EmotionId } from '@/types/emotion';
import type { Track } from '@/types/track';

export type PlaybackSignalKind = 'play' | 'skip' | 'complete';

/** 재생·스킵·완주 — 취향 프로필 집계용 */
export type PlaybackSignal = {
  youtubeId: string;
  artist: string;
  moodTags: string[];
  energyLevel?: number;
  emotionId?: EmotionId;
  kind: PlaybackSignalKind;
  at: number;
};

export type EmotionHistoryEntry = {
  id: string;
  emotionId: EmotionId;
  situation: string;
  playlistTitle: string;
  trackCount: number;
  createdAt: number;
};

/** 플레이리스트 스냅샷 — 다시 듣기용 (트랙 필드 최소화) */
export type PlaylistHistoryTrack = Pick<
  Track,
  'id' | 'youtubeId' | 'title' | 'artist' | 'thumbnailUrl' | 'moodTags' | 'energyLevel' | 'noveltyTier'
>;

export type PlaylistHistoryEntry = {
  id: string;
  emotionId: EmotionId;
  title: string;
  description: string;
  tracks: PlaylistHistoryTrack[];
  playlistSessionId?: string;
  createdAt: number;
  lastPlayedAt?: number;
};

export type EmotionRoutineTimeHint = 'dawn' | 'night' | 'focus' | 'any';

export type EmotionRoutine = {
  id: string;
  emotionId: EmotionId;
  label: string;
  timeHint: EmotionRoutineTimeHint;
  pinnedAt: number;
  lastUsedAt?: number;
};
