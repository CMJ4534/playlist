import { ALL_SEED_TRACKS } from '@/data/seeds';
import type { Track } from '@/types/track';

/** 앱 목·오프라인 fallback — seed DB 미연결 시에도 동일 카탈로그 */
export const MOCK_TRACKS: Track[] = ALL_SEED_TRACKS;
