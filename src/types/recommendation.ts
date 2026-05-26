import type { PlaylistGenerationMeta } from '@/types/recommendationStrategy';
import type { Track } from './track';

export type PlaylistRecommendation = {
  title: string;
  description: string;
  tracks: Track[];
  /** A/B·analytics 연동용 생성 메타 */
  generationMeta?: PlaylistGenerationMeta;
};
