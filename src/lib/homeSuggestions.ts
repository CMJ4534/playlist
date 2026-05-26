import { EMOTIONS } from '@/constants/emotions';
import { buildAnalyzedUserTasteProfile } from '@/lib/userTasteProfile';
import { listSavedPlaylists } from '@/services/library';
import { useListeningActivityStore } from '@/stores/listeningActivityStore';
import type { SavedPlaylistRecord } from '@/types/savedPlaylist';
import type { EmotionId } from '@/types/emotion';

export type QuickMoodEntry = {
  emotionId: EmotionId;
  emoji: string;
  label: string;
  accent: string;
};

const QUICK_MOODS: QuickMoodEntry[] = [
  { emotionId: 'dawn', emoji: '🌙', label: '밤·새벽', accent: '#9B8CFF' },
  { emotionId: 'rain', emoji: '🌧', label: '비', accent: '#5BA8C9' },
  { emotionId: 'focus', emoji: '🔥', label: '집중', accent: '#FF8A5C' },
  { emotionId: 'sad', emoji: '😔', label: '우울', accent: '#6B7FD7' },
  { emotionId: 'walk', emoji: '🚶', label: '산책', accent: '#7BC9A4' },
];

/** 시간대 + 취향 기반 오늘 추천 감정 */
export function suggestTodayEmotionId(): EmotionId {
  const taste = buildAnalyzedUserTasteProfile();
  const hour = new Date().getHours();

  if (taste.frequentEmotionIds.length) {
    const top = taste.frequentEmotionIds[0];
    if (hour >= 0 && hour < 7 && taste.frequentEmotionIds.includes('dawn')) {
      return 'dawn';
    }
    if (hour >= 9 && hour < 17 && taste.frequentEmotionIds.includes('focus')) {
      return 'focus';
    }
    return top;
  }

  if (hour >= 0 && hour < 7) return 'dawn';
  if (hour >= 7 && hour < 12) return 'focus';
  if (hour >= 12 && hour < 17) return 'walk';
  if (hour >= 17 && hour < 22) return 'rain';
  return 'sad';
}

export function getQuickMoodEntries(): QuickMoodEntry[] {
  return QUICK_MOODS;
}

export function getRecentEmotions(limit = 4) {
  const seen = new Set<EmotionId>();
  const out: { emotionId: EmotionId; label: string; emoji: string; accent: string; situation?: string }[] = [];

  for (const entry of useListeningActivityStore.getState().emotionHistory) {
    if (seen.has(entry.emotionId)) continue;
    seen.add(entry.emotionId);
    const meta = EMOTIONS.find((e) => e.id === entry.emotionId);
    if (!meta) continue;
    out.push({
      emotionId: entry.emotionId,
      label: meta.label,
      emoji: meta.emoji,
      accent: meta.accent,
      situation: entry.situation || undefined,
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** 취향·히스토리 기반 자주 듣는 감정 (홈 CTA) */
export function getFrequentEmotions(limit = 4) {
  const taste = buildAnalyzedUserTasteProfile();
  const ids: EmotionId[] = [];

  for (const id of taste.frequentEmotionIds) {
    if (!ids.includes(id)) ids.push(id);
  }
  for (const entry of useListeningActivityStore.getState().emotionHistory) {
    if (!ids.includes(entry.emotionId)) ids.push(entry.emotionId);
  }

  return ids.slice(0, limit).map((emotionId) => {
    const meta = EMOTIONS.find((e) => e.id === emotionId);
    return {
      emotionId,
      label: meta?.label ?? emotionId,
      emoji: meta?.emoji ?? '🎧',
      accent: meta?.accent ?? '#8B7CFF',
      count: taste.emotionCounts[emotionId] ?? 0,
    };
  });
}

/** 오늘 다시 듣기 — 저장 플리 우선, 없으면 최근 히스토리 */
export function getTodayListenAgain(): SavedPlaylistRecord | null {
  const saved = listSavedPlaylists();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const start = todayStart.getTime();

  const savedToday = saved.find((p) => p.savedAt >= start);
  if (savedToday) return savedToday;

  if (saved.length) return saved[0];

  const history = useListeningActivityStore.getState().playlistHistory;
  const histToday = history.find((h) => (h.lastPlayedAt ?? h.createdAt) >= start);
  if (histToday) return mapHistoryToSaved(histToday);
  if (history[0]) return mapHistoryToSaved(history[0]);
  return null;
}

function mapHistoryToSaved(
  h: ReturnType<typeof useListeningActivityStore.getState>['playlistHistory'][0]
): SavedPlaylistRecord {
  return {
    id: h.id,
    emotionId: h.emotionId,
    title: h.title,
    description: h.description,
    tracks: h.tracks,
    savedAt: h.lastPlayedAt ?? h.createdAt,
    createdAt: h.createdAt,
    sourcePlaylistHistoryId: h.id,
    replayCount: 0,
    meta: {
      visibility: 'private',
      shareSlug: null,
      ownerUserId: null,
      feedPostId: null,
    },
  };
}

export function getActiveRoutines() {
  const hour = new Date().getHours();
  return useListeningActivityStore
    .getState()
    .routines.filter((r) => {
      if (r.timeHint === 'dawn') return hour >= 0 && hour < 9;
      if (r.timeHint === 'night') return hour >= 18 || hour < 3;
      if (r.timeHint === 'focus') return hour >= 8 && hour < 19;
      return true;
    })
    .slice(0, 3);
}
