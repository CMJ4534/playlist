import { isPlaybackDebugEnabled } from '@/constants/dev';
import { playbackErrorLabel } from '@/lib/youtubePlaybackErrors';
import { usePlaybackDebugStore } from '@/stores/playbackDebugStore';
import type { PlaybackErrorKind } from '@/types/playback';

export function notePlaybackSkip(reason: string): void {
  if (!isPlaybackDebugEnabled()) return;
  usePlaybackDebugStore.getState().noteSkip(reason);
}

export function notePlaybackError(kind: PlaybackErrorKind, message?: string): void {
  if (!isPlaybackDebugEnabled()) return;
  usePlaybackDebugStore.getState().noteError(message ?? playbackErrorLabel(kind));
}
