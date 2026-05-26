import { analyticsOnQueueStart } from '@/lib/analyticsPlayback';
import { replayPlaylistFromHistory } from '@/lib/replayPlaylist';
import { useRecommendationSessionStore } from '@/stores/recommendationSessionStore';
import { usePlayerStore } from '@/stores/playerStore';
import { useToastStore } from '@/stores/toastStore';
import { useUserLibraryStore } from '@/stores/userLibraryStore';
import type { SavePlaylistInput, SavedPlaylistRecord } from '@/types/savedPlaylist';
import type { Track } from '@/types/track';

/**
 * 저장 플레이리스트 도메인 — UI는 store 직접 호출 대신 이 서비스 사용.
 */
export function listSavedPlaylists(): SavedPlaylistRecord[] {
  return useUserLibraryStore.getState().listSavedPlaylists();
}

export function getSavedPlaylist(id: string): SavedPlaylistRecord | undefined {
  return useUserLibraryStore.getState().getSavedPlaylist(id);
}

export function savePlaylist(input: SavePlaylistInput): SavedPlaylistRecord {
  return useUserLibraryStore.getState().savePlaylist(input);
}

export function savePlaylistWithToast(input: SavePlaylistInput): SavedPlaylistRecord {
  const entry = savePlaylist(input);
  useToastStore.getState().show('플레이리스트를 저장했어요 · 라이브러리에서 다시 들을 수 있어요');
  return entry;
}

export function removeSavedPlaylist(id: string): boolean {
  const ok = useUserLibraryStore.getState().removeSavedPlaylist(id);
  if (ok) {
    useToastStore.getState().show('저장 목록에서 삭제했어요');
  }
  return ok;
}

/** 저장 플레이리스트 → 재생 큐 복원 */
export function replaySavedPlaylist(savedId: string): boolean {
  const entry = getSavedPlaylist(savedId);
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
  useUserLibraryStore.getState().recordSavedReplay(savedId);
  analyticsOnQueueStart(tracks, 0, entry.emotionId);
  return true;
}

/** 저장 플리 또는 최근 히스토리(id prefix) 재생 */
export function replayListenAgainTarget(
  entry: SavedPlaylistRecord
): boolean {
  if (entry.id.startsWith('saved_')) {
    return replaySavedPlaylist(entry.id);
  }
  return replayPlaylistFromHistory(entry.id);
}

export function formatSavedDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) return '오늘';
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
