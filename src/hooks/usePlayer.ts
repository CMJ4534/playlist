import {
  selectCurrentTrack,
  selectCurrentYoutubeId,
} from '@/stores/selectors/playerSelectors';
import { usePlayerStore } from '@/stores/playerStore';

/**
 * playerStore selector를 화면에서 일관되게 쓰기 위한 thin hook.
 */
export function usePlayer() {
  const track = usePlayerStore(selectCurrentTrack);
  const youtubeId = usePlayerStore(selectCurrentYoutubeId);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const queueRevision = usePlayerStore((s) => s.queueRevision);
  const playbackStatus = usePlayerStore((s) => s.playbackStatus);
  const playbackErrorMessage = usePlayerStore((s) => s.playbackErrorMessage);
  const positionSec = usePlayerStore((s) => s.positionSec);
  const durationSec = usePlayerStore((s) => s.durationSec);

  const progress =
    durationSec > 0 ? Math.min(1, positionSec / durationSec) : 0;

  const setQueue = usePlayerStore((s) => s.setQueue);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const play = usePlayerStore((s) => s.play);
  const pause = usePlayerStore((s) => s.pause);

  return {
    track,
    youtubeId,
    isPlaying,
    queue,
    currentIndex,
    queueRevision,
    playbackStatus,
    playbackErrorMessage,
    positionSec,
    durationSec,
    progress,
    setQueue,
    togglePlay,
    next,
    prev,
    play,
    pause,
  };
}
