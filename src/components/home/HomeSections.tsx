import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EMOTIONS } from '@/constants/emotions';
import { moodTheme } from '@/constants/moodTheme';
import { getTodayEmotionCopy } from '@/lib/homeCopy';
import { LIBRARY_LIST_HREF, libraryDetailHref } from '@/lib/navigation';
import {
  getActiveRoutines,
  getFrequentEmotions,
  getQuickMoodEntries,
  getRecentEmotions,
  getTodayListenAgain,
  suggestTodayEmotionId,
} from '@/lib/homeSuggestions';
import { replayListenAgainTarget } from '@/services/library';
import { restoreResumableRecommendation } from '@/services/revisit/revisitService';
import { replayPlaylistFromHistory } from '@/lib/replayPlaylist';
import { useGrowthSessionStore } from '@/stores/growthSessionStore';
import { useListeningActivityStore } from '@/stores/listeningActivityStore';
import { useRevisitStore } from '@/stores/revisitStore';
import { useUserLibraryStore } from '@/stores/userLibraryStore';

const REVISIT_MAX_MS = 48 * 60 * 60 * 1000;

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

/** 마지막 추천 결과 이어서 보기 */
export function HomeResumeRecommendation() {
  const last = useRevisitStore((s) => s.lastRecommendation);
  const snap =
    last && Date.now() - last.savedAt <= REVISIT_MAX_MS && last.result.tracks.length ?
      last
    : null;

  if (!snap) return null;

  const emotion = EMOTIONS.find((e) => e.id === snap.emotionId);

  return (
    <Pressable
      onPress={() => {
        if (restoreResumableRecommendation()) {
          router.push('/recommendation');
        }
      }}
      style={({ pressed }) => [styles.resumeCard, pressed && styles.pressed]}>
      <Text style={styles.resumeLabel}>방금 받은 추천</Text>
      <Text style={styles.resumeTitle} numberOfLines={1}>
        {emotion?.emoji} {snap.result.title}
      </Text>
      <Text style={styles.resumeSub}>다시 보거나 바로 재생할 수 있어요</Text>
    </Pressable>
  );
}

export function HomeListenAgainToday() {
  const target = getTodayListenAgain();
  if (!target) return null;

  const emotion = EMOTIONS.find((e) => e.id === target.emotionId);

  return (
    <Pressable
      onPress={() => {
        if (!replayListenAgainTarget(target)) return;
        router.push('/player');
      }}
      style={({ pressed }) => [styles.todayCard, pressed && styles.pressed]}>
      <Text style={styles.todayLabel}>오늘 다시 듣기</Text>
      <View style={styles.todayRow}>
        <Text style={styles.todayEmoji}>{emotion?.emoji ?? '🎵'}</Text>
        <View style={styles.todayText}>
          <Text style={styles.todayTitle} numberOfLines={1}>
            {target.title}
          </Text>
          <Text style={styles.todaySub}>
            {target.tracks.length}곡 · 탭하면 바로 재생
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

export function HomeSavedPlaylists() {
  const saved = useUserLibraryStore((s) => s.savedPlaylists).slice(0, 4);
  if (!saved.length) return null;

  return (
    <View>
      <View style={styles.sectionHeaderRow}>
        <SectionTitle>최근 저장한 플레이리스트</SectionTitle>
        <Pressable onPress={() => router.push(LIBRARY_LIST_HREF)} hitSlop={8}>
          <Text style={styles.seeAll}>전체</Text>
        </Pressable>
      </View>
      {saved.map((p) => {
        const emotion = EMOTIONS.find((e) => e.id === p.emotionId);
        return (
          <Pressable
            key={p.id}
            onPress={() => router.push(libraryDetailHref(p.id))}
            style={({ pressed }) => [styles.historyRow, pressed && styles.pressed]}>
            <Text style={styles.historyEmoji}>{emotion?.emoji ?? '🎵'}</Text>
            <View style={styles.historyText}>
              <Text style={styles.historyTitle} numberOfLines={1}>
                {p.title}
              </Text>
              <Text style={styles.historySub} numberOfLines={1}>
                {emotion?.label} · {p.tracks.length}곡
              </Text>
            </View>
            <Text style={styles.replayLabel}>›</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function HomeFrequentEmotions() {
  const frequent = getFrequentEmotions(3);
  if (!frequent.length) return null;

  const top = frequent[0];

  return (
    <View>
      <SectionTitle>자주 듣는 감정</SectionTitle>
      <Pressable
        onPress={() =>
          router.push({ pathname: '/emotion', params: { emotionId: top.emotionId } })
        }
        style={({ pressed }) => [styles.frequentHero, pressed && styles.pressed]}>
        <Text style={styles.frequentEmoji}>{top.emoji}</Text>
        <View style={styles.frequentText}>
          <Text style={styles.frequentTitle}>{top.label}</Text>
          <Text style={styles.frequentSub}>이 무드로 바로 플레이리스트 받기</Text>
        </View>
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {frequent.slice(1).map((f) => (
          <Pressable
            key={f.emotionId}
            onPress={() =>
              router.push({ pathname: '/emotion', params: { emotionId: f.emotionId } })
            }
            style={({ pressed }) => [
              styles.recentChip,
              { borderColor: f.accent + '55' },
              pressed && styles.pressed,
            ]}>
            <Text style={styles.recentEmoji}>{f.emoji}</Text>
            <Text style={styles.recentLabel}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export function HomeTodayMoodCard() {
  const emotionId = suggestTodayEmotionId();
  const emotion = EMOTIONS.find((e) => e.id === emotionId);

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/emotion', params: { emotionId } })
      }
      style={({ pressed }) => [styles.todayCard, pressed && styles.pressed]}>
      <Text style={styles.todayLabel}>오늘의 감정 추천</Text>
      <View style={styles.todayRow}>
        <Text style={styles.todayEmoji}>{emotion?.emoji ?? '🎧'}</Text>
        <View style={styles.todayText}>
          <Text style={styles.todayTitle}>{emotion?.label ?? '감정 선택'}</Text>
          <Text style={styles.todaySub}>{getTodayEmotionCopy(emotionId)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export function HomeQuickMoodRow() {
  const moods = getQuickMoodEntries();

  return (
    <View>
      <SectionTitle>지금 바로</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}>
        {moods.map((m) => (
          <Pressable
            key={m.emotionId}
            onPress={() =>
              router.push({ pathname: '/emotion', params: { emotionId: m.emotionId } })
            }
            style={({ pressed }) => [
              styles.quickChip,
              { borderColor: m.accent + '66' },
              pressed && styles.pressed,
            ]}>
            <Text style={styles.quickEmoji}>{m.emoji}</Text>
            <Text style={styles.quickLabel}>{m.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export function HomeRecentEmotions() {
  const recent = getRecentEmotions();
  if (!recent.length) return null;

  return (
    <View>
      <SectionTitle>최근 감정</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {recent.map((r) => (
          <Pressable
            key={r.emotionId}
            onPress={() =>
              router.push({ pathname: '/emotion', params: { emotionId: r.emotionId } })
            }
            style={({ pressed }) => [
              styles.recentChip,
              { borderColor: r.accent + '55' },
              pressed && styles.pressed,
            ]}>
            <Text style={styles.recentEmoji}>{r.emoji}</Text>
            <Text style={styles.recentLabel}>{r.label}</Text>
            {r.situation ?
              <Text style={styles.recentSituation} numberOfLines={1}>
                {r.situation}
              </Text>
            : null}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export function HomeRoutines() {
  const routines = getActiveRoutines();
  if (!routines.length) return null;

  return (
    <View>
      <SectionTitle>나의 루틴</SectionTitle>
      {routines.map((r) => (
        <Pressable
          key={r.id}
          onPress={() => {
            useListeningActivityStore.getState().markRoutineUsed(r.id);
            useGrowthSessionStore.getState().recordRoutineUsed();
            router.push({ pathname: '/emotion', params: { emotionId: r.emotionId } });
          }}
          style={({ pressed }) => [styles.routineRow, pressed && styles.pressed]}>
          <Text style={styles.routineEmoji}>
            {EMOTIONS.find((e) => e.id === r.emotionId)?.emoji ?? '🎵'}
          </Text>
          <View style={styles.routineText}>
            <Text style={styles.routineTitle}>{r.label}</Text>
            <Text style={styles.routineSub}>한 번 탭으로 플레이리스트 만들기</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function HomePlaylistHistory() {
  const history = useListeningActivityStore((s) => s.playlistHistory).slice(0, 5);
  if (!history.length) return null;

  const handleReplay = (id: string) => {
    if (!replayPlaylistFromHistory(id)) return;
    router.push('/player');
  };

  return (
    <View>
      <SectionTitle>다시 듣기</SectionTitle>
      {history.map((p) => {
        const emotion = EMOTIONS.find((e) => e.id === p.emotionId);
        return (
          <Pressable
            key={p.id}
            onPress={() => handleReplay(p.id)}
            style={({ pressed }) => [styles.historyRow, pressed && styles.pressed]}>
            <Text style={styles.historyEmoji}>{emotion?.emoji ?? '🎵'}</Text>
            <View style={styles.historyText}>
              <Text style={styles.historyTitle} numberOfLines={1}>
                {p.title}
              </Text>
              <Text style={styles.historySub} numberOfLines={1}>
                {p.tracks.length}곡 · {emotion?.label}
              </Text>
            </View>
            <Text style={styles.replayLabel}>재생</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: moodTheme.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: moodTheme.spacing.sm,
  },
  pressed: { opacity: 0.88 },
  todayCard: {
    padding: moodTheme.spacing.md,
    borderRadius: moodTheme.radius.lg,
    backgroundColor: moodTheme.surface,
    borderWidth: 1,
    borderColor: moodTheme.border,
    gap: moodTheme.spacing.sm,
  },
  todayLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: moodTheme.primary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moodTheme.spacing.md,
  },
  todayEmoji: { fontSize: 36 },
  todayText: { flex: 1, gap: 4 },
  todayTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: moodTheme.text,
  },
  todaySub: {
    fontSize: 14,
    color: moodTheme.textMuted,
    lineHeight: 20,
  },
  quickScroll: { marginBottom: 4 },
  quickChip: {
    marginRight: moodTheme.spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: moodTheme.radius.lg,
    backgroundColor: moodTheme.surface,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 72,
    gap: 4,
  },
  quickEmoji: { fontSize: 22 },
  quickLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: moodTheme.text,
  },
  recentChip: {
    marginRight: moodTheme.spacing.sm,
    padding: moodTheme.spacing.md,
    borderRadius: moodTheme.radius.lg,
    backgroundColor: moodTheme.surface,
    borderWidth: 1,
    width: 120,
    gap: 4,
  },
  recentEmoji: { fontSize: 24 },
  recentLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: moodTheme.text,
  },
  recentSituation: {
    fontSize: 11,
    color: moodTheme.textDim,
  },
  routineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: moodTheme.spacing.md,
    borderRadius: moodTheme.radius.md,
    backgroundColor: moodTheme.surface,
    borderWidth: 1,
    borderColor: moodTheme.border,
    marginBottom: moodTheme.spacing.sm,
    gap: moodTheme.spacing.md,
  },
  routineEmoji: { fontSize: 28 },
  routineText: { flex: 1 },
  routineTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: moodTheme.text,
  },
  routineSub: {
    fontSize: 12,
    color: moodTheme.textMuted,
    marginTop: 2,
  },
  chevron: {
    fontSize: 22,
    color: moodTheme.textDim,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: moodTheme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: moodTheme.border,
  },
  historyEmoji: { fontSize: 24 },
  historyText: { flex: 1 },
  historyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: moodTheme.text,
  },
  historySub: {
    fontSize: 12,
    color: moodTheme.textMuted,
    marginTop: 2,
  },
  replayLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: moodTheme.primary,
  },
  resumeCard: {
    padding: moodTheme.spacing.md,
    borderRadius: moodTheme.radius.lg,
    backgroundColor: moodTheme.surfaceElevated,
    borderWidth: 1,
    borderColor: moodTheme.primary + '44',
    gap: 6,
  },
  resumeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: moodTheme.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  resumeTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: moodTheme.text,
  },
  resumeSub: {
    fontSize: 13,
    color: moodTheme.textMuted,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: moodTheme.spacing.sm,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: moodTheme.primary,
  },
  frequentHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moodTheme.spacing.md,
    padding: moodTheme.spacing.md,
    borderRadius: moodTheme.radius.lg,
    backgroundColor: moodTheme.surface,
    borderWidth: 1,
    borderColor: moodTheme.border,
    marginBottom: moodTheme.spacing.sm,
  },
  frequentEmoji: { fontSize: 32 },
  frequentText: { flex: 1, gap: 4 },
  frequentTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: moodTheme.text,
  },
  frequentSub: {
    fontSize: 13,
    color: moodTheme.textMuted,
  },
});
