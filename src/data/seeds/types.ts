import type { NoveltyTier } from '@/types/track';

/** seed 파일 한 줄 정의 (id·thumbnail은 helpers가 채움) */
export type SeedTrackDef = {
  title: string;
  artist: string;
  youtubeId: string;
  energyLevel: number;
  noveltyTier: NoveltyTier;
  /** 카테고리 공통 태그 외 추가 mood_tags */
  moodTags?: string[];
  durationSec?: number;

  // ─── 확장 메타 (catalog pipeline이 채움) ─────────
  /** 곡 수집 출처 */
  source?: TrackSource;
  /** 언어 (ko, en, ja 등) */
  language?: string;
  /** 국가 (KR, US, JP 등) */
  country?: string;
  /** 0~100 인기도 (YouTube 조회수 기반) */
  popularityScore?: number;
  /** 성인 콘텐츠 여부 */
  explicit?: boolean;

  // ─── catalog scoring (추천 품질용) ──────────────
  /** 0~1 최신성 (최근 1년 1.0 → 5년+ 0.2) */
  freshness?: number;
  /** 0~1 대중 친숙도 (조회수·차트 기반) */
  familiarity?: number;
  /** 0~1 감정 강도 (가사·멜로디 기반) */
  emotionalIntensity?: number;
  /** 0~1 반복 재생 적합도 */
  replayability?: number;
};

export type TrackSource =
  | 'manual'
  | 'youtube_search'
  | 'youtube_mix'
  | 'spotify_import'
  | 'user_suggestion'
  | 'ai_generated';

export type SeedCategory =
  | 'sad'
  | 'dawn'
  | 'focus'
  | 'rain'
  | 'walking'
  | 'blank';

export type VerifiedStatus =
  | 'playable'
  | 'pending'
  | 'replaced'
  | 'not_found'
  | 'embedding_restricted'
  | 'invalid_id';

/** 재생 불가 상태 — 추천 후보에서 절대 제외 */
export const BLOCKED_STATUSES: readonly VerifiedStatus[] = [
  'embedding_restricted',
  'invalid_id',
  'not_found',
];

/** catalogMeta.json 개별 엔트리 — 운영·검증 상태 */
export type CatalogMetaEntry = {
  disabled?: boolean;
  disabledReason?: string | null;
  verifiedAt?: string | null;
  verifiedStatus?: VerifiedStatus | null;
  /** 수집 출처 */
  source?: TrackSource;
  /** 마지막 검증 (playback verify) 결과 */
  lastPlaybackCheckAt?: string | null;
  lastPlaybackCheckStatus?: string | null;
};
