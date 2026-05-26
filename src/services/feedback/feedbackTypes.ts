import type { EmotionId } from '@/types/emotion';

/** 1~5 또는 null(스킵) */
export type FeedbackRating = 1 | 2 | 3 | 4 | 5;

export type FeedbackCategory =
  | 'playlist_quality'
  | 'playback'
  | 'recommendation'
  | 'general';

export type FeedbackCurrentTrack = {
  youtubeId: string;
  title: string;
  artist: string;
};

/**
 * 사용자 피드백 — 추후 API body와 1:1 매핑.
 */
export type FeedbackPayload = {
  id: string;
  createdAt: number;
  category: FeedbackCategory;
  emotionId?: EmotionId;
  playlistSessionId?: string;
  strategyId?: string;
  strategyVersion?: string;
  rating?: FeedbackRating;
  comment?: string;
  currentTrack?: FeedbackCurrentTrack;
  appVersion: string;
  appEnv: string;
  /** 확장 필드 (실험 메타 등) */
  meta?: Record<string, unknown>;
};

export type SubmitFeedbackInput = Omit<
  FeedbackPayload,
  'id' | 'createdAt' | 'appVersion' | 'appEnv'
> & {
  rating?: FeedbackRating;
  comment?: string;
};
