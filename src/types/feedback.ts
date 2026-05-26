import type { EmotionId } from '@/types/emotion';
import type { RecommendationStrategyId } from '@/types/recommendationStrategy';

// ─── 피드백 sentiment ──────────────────────────────
export type FeedbackSentiment = 'great' | 'ok' | 'poor';

export type FeedbackCategory =
  | 'playlist_quality'
  | 'track_repetition'
  | 'playback_issue'
  | 'mood_mismatch'
  | 'general';

// ─── 피드백 항목 ──────────────────────────────────
export type FeedbackEntry = {
  id: string;
  sentiment: FeedbackSentiment;
  /** 선택적 한줄 코멘트 */
  comment: string | null;
  category: FeedbackCategory;
  emotionId: EmotionId | null;
  /** 추천 세션 식별 */
  playlistSessionId: string | null;
  /** A/B 실험 연동 */
  strategyId: RecommendationStrategyId | null;
  strategyVersion: string | null;
  experimentVariant: string | null;
  /** 해당 세션 통계 */
  tracksPlayed: number;
  tracksSkipped: number;
  queueLength: number;
  /** 큐·상태 */
  status: FeedbackUploadStatus;
  createdAt: number;
  uploadedAt: number | null;
  uploadAttempts: number;
  lastError: string | null;
};

export type FeedbackUploadStatus = 'pending' | 'uploaded' | 'failed';

// ─── 서버 업로드 페이로드 ───────────────────────────
export type FeedbackUploadPayload = Omit<
  FeedbackEntry,
  'status' | 'uploadedAt' | 'uploadAttempts' | 'lastError'
>;

// ─── Feedback Inbox (운영자용 서버 스키마) ─────────
export type FeedbackInboxRow = {
  id: string;
  sentiment: FeedbackSentiment;
  comment: string | null;
  category: FeedbackCategory;
  emotion_id: string | null;
  playlist_session_id: string | null;
  strategy_id: string | null;
  strategy_version: string | null;
  experiment_variant: string | null;
  tracks_played: number;
  tracks_skipped: number;
  queue_length: number;
  device_id: string | null;
  app_version: string | null;
  platform: string | null;
  created_at: string;
  uploaded_at: string;
};
