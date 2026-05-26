import { router, Stack } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EMOTIONS } from '@/constants/emotions';
import { moodTheme } from '@/constants/moodTheme';
import { libraryDetailHref } from '@/lib/navigation';
import {
  formatSavedDate,
  listSavedPlaylists,
  replaySavedPlaylist,
  removeSavedPlaylist,
} from '@/services/library';
import { MAX_SAVED_PLAYLISTS } from '@/stores/userLibraryStore';

export default function LibraryScreen() {
  const playlists = listSavedPlaylists();

  const handleReplay = (id: string) => {
    if (!replaySavedPlaylist(id)) return;
    router.push('/player');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: '저장한 플레이리스트',
          headerStyle: { backgroundColor: moodTheme.bg },
          headerTintColor: moodTheme.text,
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.sub}>
          {playlists.length} / {MAX_SAVED_PLAYLISTS} · 탭해서 다시 듣거나 공유할 수 있어요
        </Text>

        {!playlists.length ?
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>아직 저장한 플레이리스트가 없어요</Text>
            <Text style={styles.emptySub}>
              추천 결과에서 「플레이리스트 저장」을 눌러 보관해 보세요
            </Text>
          </View>
        : null}

        {playlists.map((p) => {
          const emotion = EMOTIONS.find((e) => e.id === p.emotionId);
          return (
            <View key={p.id} style={styles.row}>
              <Pressable
                style={styles.rowMain}
                onPress={() => router.push(libraryDetailHref(p.id))}>
                <Text style={styles.rowEmoji}>{emotion?.emoji ?? '🎵'}</Text>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {p.title}
                  </Text>
                  <Text style={styles.rowSub} numberOfLines={1}>
                    {emotion?.label} · {p.tracks.length}곡 · {formatSavedDate(p.savedAt)}
                    {p.replayCount > 0 ? ` · ${p.replayCount}회 재생` : ''}
                  </Text>
                </View>
              </Pressable>
              <Pressable onPress={() => handleReplay(p.id)} style={styles.replayBtn}>
                <Text style={styles.replayText}>▶</Text>
              </Pressable>
              <Pressable
                onPress={() => removeSavedPlaylist(p.id)}
                hitSlop={8}
                style={styles.deleteBtn}>
                <Text style={styles.deleteText}>✕</Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: moodTheme.bg },
  scroll: {
    padding: moodTheme.spacing.screen,
    paddingBottom: 48,
    gap: moodTheme.spacing.sm,
  },
  sub: {
    fontSize: 13,
    color: moodTheme.textMuted,
    marginBottom: moodTheme.spacing.md,
  },
  empty: {
    padding: moodTheme.spacing.lg,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: moodTheme.text,
  },
  emptySub: {
    fontSize: 14,
    color: moodTheme.textMuted,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: moodTheme.surface,
    borderRadius: moodTheme.radius.lg,
    borderWidth: 1,
    borderColor: moodTheme.border,
    marginBottom: moodTheme.spacing.sm,
    overflow: 'hidden',
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: moodTheme.spacing.md,
    gap: moodTheme.spacing.md,
  },
  rowEmoji: { fontSize: 26 },
  rowText: { flex: 1, gap: 4 },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: moodTheme.text,
  },
  rowSub: {
    fontSize: 12,
    color: moodTheme.textMuted,
  },
  replayBtn: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderLeftWidth: 1,
    borderLeftColor: moodTheme.border,
  },
  replayText: {
    fontSize: 16,
    color: moodTheme.primary,
    fontWeight: '700',
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  deleteText: {
    fontSize: 14,
    color: moodTheme.textDim,
  },
});
