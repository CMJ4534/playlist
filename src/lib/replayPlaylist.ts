import { analyticsOnQueueStart } from '@/lib/analyticsPlayback';
import { useListeningActivityStore } from '@/stores/listeningActivityStore';
import { useUserLibraryStore } from '@/stores/userLibraryStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useRecommendationSessionStore } from '@/stores/recommendationSessionStore';
import type { Track } from '@/types/track';

/** 저장된 플레이리스트 히스토리 → 세션·큐 복원 */
export function replayPlaylistFromHistory(playlistId: string): boolean {
  const entry = useListeningActivityStore.getState().getPlaylistById(playlistId);
  if (!entry?.tracks.length) return false;

  const tracks = entry.tracks as Track[];

  useRecommendationSessionStore.getState().setSession(
    {
      emotionId: entry.emotionId,
      situation: '',
      result: {
        title: entry.title,
        description: entry.description,
        tracks,
      },
    },
    { skipActivityLog: true }
  );

  usePlayerStore.getState().setQueue(tracks, 0);
  useListeningActivityStore.getState().touchPlaylistPlayed(playlistId);
  const counts = useUserLibraryStore.getState().replayCountByPlaylistId;
  useUserLibraryStore.setState({
    replayCountByPlaylistId: {
      ...counts,
      [playlistId]: (counts[playlistId] ?? 0) + 1,
    },
  });
  analyticsOnQueueStart(tracks, 0, entry.emotionId);
  return true;
}
