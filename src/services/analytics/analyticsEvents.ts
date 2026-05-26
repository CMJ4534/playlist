import type { EmotionId } from '@/types/emotion';
import type { PlaybackErrorKind } from '@/types/playback';

/** 추천 소스 — 추후 Mixpanel/Amplitude 속성과 1:1 매핑 */
export type RecommendationSource = 'edge' | 'mock' | 'fallback';

export type RecommendationFailureReason =
  | 'timeout'
  | 'network'
  | 'malformed'
  | 'empty_tracks'
  | 'edge_error'
  | 'not_configured'
  | 'unknown';

/**
 * Analytics 이벤트 스키마 — event name → payload.
 * trackEvent(name, payload) 시 타입 안전.
 */
export type AnalyticsEventMap = {
  recommendation_requested: {
    emotionId: EmotionId;
    hasSituation: boolean;
    excludeCount: number;
    candidateCount?: number;
    verifiedCount?: number;
    playableRatio?: number;
  };
  recommendation_success: {
    emotionId: EmotionId;
    source: RecommendationSource;
    trackCount: number;
    durationMs: number;
  };
  recommendation_fallback: {
    emotionId: EmotionId;
    reason: RecommendationFailureReason;
    trackCount: number;
    durationMs: number;
  };

  track_play: {
    youtubeId: string;
    trackIndex: number;
    queueLength: number;
    playlistSessionId: string;
    emotionId?: EmotionId;
    trigger: 'queue_start' | 'auto_advance' | 'resume';
  };
  track_skip: {
    youtubeId: string;
    trackIndex: number;
    queueLength: number;
    playlistSessionId: string;
    emotionId?: EmotionId;
    reason: string;
    isAutoSkip: boolean;
  };
  playback_error: {
    youtubeId: string;
    kind: PlaybackErrorKind;
    trackIndex: number;
    playlistSessionId: string;
    emotionId?: EmotionId;
    consecutiveSkips: number;
  };
  playlist_completed: {
    playlistSessionId: string;
    emotionId?: EmotionId;
    queueLength: number;
    tracksPlayed: number;
    skipCount: number;
    durationMs: number;
  };
  feedback_submitted: {
    category: string;
    rating?: number;
    hasComment: boolean;
    emotionId?: EmotionId | undefined;
    sentiment?: 'great' | 'ok' | 'poor';
  };
  home_screen_view: {
    openCount: number;
    homeVisitCount: number;
    daysSinceFirstOpen: number;
  };
  routine_used: {
    totalRoutineUses: number;
  };
  playlist_replayed: {
    playlistHistoryId: string;
    replayCount: number;
  };
  track_liked: {
    youtubeId: string;
    artist: string;
  };
  track_unliked: {
    youtubeId: string;
  };
  playlist_saved: {
    emotionId: EmotionId;
    trackCount: number;
  };
  playlist_quality_prompt_shown: {
    playlistSessionId: string;
    trigger: string;
  };
  playlist_quality_rated: {
    playlistSessionId: string;
    rating: 1 | 3 | 5;
    sentiment: 'great' | 'ok' | 'poor';
    emotionId?: EmotionId;
  };

  /** 피드백 코멘트 포함 상세 제출 */
  feedback_detailed: {
    feedbackId: string;
    sentiment: 'great' | 'ok' | 'poor';
    category: string;
    hasComment: boolean;
    commentLength: number;
    emotionId?: EmotionId;
    strategyId?: string;
    experimentVariant?: string;
    tracksPlayed: number;
    tracksSkipped: number;
    queueLength: number;
  };

  /** 피드백 큐 업로드 배치 */
  feedback_queue_processed: {
    uploaded: number;
    failed: number;
    skipped: number;
    queueSize: number;
  };
};

export type AnalyticsEventName = keyof AnalyticsEventMap;

export type AnalyticsEventPayload<E extends AnalyticsEventName> =
  AnalyticsEventMap[E];
