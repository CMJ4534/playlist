import { useListeningActivityStore } from '@/stores/listeningActivityStore';
import type { EmotionId } from '@/types/emotion';
import type { PlaybackSignalKind } from '@/types/listeningActivity';
import type { Track } from '@/types/track';

export function recordListeningSignal(
  track: Track | null | undefined,
  kind: PlaybackSignalKind,
  emotionId?: EmotionId
): void {
  if (!track?.youtubeId?.trim()) return;

  useListeningActivityStore.getState().recordPlaybackSignal({
    youtubeId: track.youtubeId,
    artist: track.artist,
    moodTags: track.moodTags ?? [],
    energyLevel: track.energyLevel,
    emotionId,
    kind,
  });
}
