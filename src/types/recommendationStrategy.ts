import type { EmotionId } from '@/types/emotion';
import type { PlaylistDiversityScore } from '@/lib/recommendationDiversity';

/**
 * 추천 A/B 실험용 전략 ID — 로직 분기는 점진적으로 연결.
 */
export type RecommendationStrategyId =
  | 'v1_curated_arc'
  | 'v2_diverse_wave'
  | 'v3_low_energy_focus';

export type StrategyVersion = '1.0.0';

/** 플레이리스트 생성 시 analytics·품질 피드백에 붙는 메타 */
export type PlaylistGenerationMeta = {
  strategyId: RecommendationStrategyId;
  strategyVersion: StrategyVersion;
  emotionId: EmotionId;
  trackCount: number;
  generatedAt: number;
  diversityScore?: PlaylistDiversityScore;
  /** 실험 variant (추후 remote config) */
  experimentVariant?: string;
};
