import type { Track } from '@/types/track';

export type PlayerSlice = {
  queue: Track[];
  currentIndex: number;
};

export function selectCurrentTrack(state: PlayerSlice): Track | null {
  const { queue, currentIndex } = state;
  if (!queue.length) return null;
  const index = Math.min(Math.max(currentIndex, 0), queue.length - 1);
  return queue[index] ?? null;
}

export function selectCurrentYoutubeId(state: PlayerSlice): string | null {
  return selectCurrentTrack(state)?.youtubeId ?? null;
}

export function selectHasActiveQueue(state: PlayerSlice): boolean {
  return state.queue.length > 0 && selectCurrentTrack(state) !== null;
}
