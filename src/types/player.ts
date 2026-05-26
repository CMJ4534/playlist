import type { Track } from './track';

/** 반복 모드 — UI·store·플레이어가 동일 enum 사용 */
export type RepeatMode = 'off' | 'all' | 'one';

/** playerStore에서 다루는 큐 스냅샷 (디버깅·테스트용) */
export type PlayerQueueState = {
  queue: Track[];
  currentIndex: number;
  isShuffled: boolean;
  repeatMode: RepeatMode;
  isPlaying: boolean;
};
