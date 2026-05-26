import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlaylistShareCard } from '@/components/library/PlaylistShareCard';
import { EMOTIONS } from '@/constants/emotions';
import { moodTheme } from '@/constants/moodTheme';
import {
  buildShareCardModel,
  getSavedPlaylist,
  removeSavedPlaylist,
  replaySavedPlaylist,
  sharePlaylistCardImage,
} from '@/services/library';
import { useToastStore } from '@/stores/toastStore';

export default function SavedPlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  const playlist = id ? getSavedPlaylist(id) : undefined;

  if (!playlist) {
    return (
      <SafeAreaView style={styles.safe}>
        <Stack.Screen options={{ title: '플레이리스트' }} />
        <View style={styles.center}>
          <Text style={styles.muted}>플레이리스트를 찾을 수 없어요</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.link}>돌아가기</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const emotion = EMOTIONS.find((e) => e.id === playlist.emotionId);
  const shareModel = buildShareCardModel(playlist);

  const handleShare = async () => {
    setSharing(true);
    const ok = await sharePlaylistCardImage(cardRef, playlist.title);
    setSharing(false);
    if (ok) {
      useToastStore.getState().show('공유 카드를 보냈어요');
    } else {
      useToastStore.getState().show('공유를 완료하지 못했어요');
    }
  };

  const handleReplay = () => {
    if (!replaySavedPlaylist(playlist.id)) return;
    router.push('/player');
  };

  const handleRemove = () => {
    removeSavedPlaylist(playlist.id);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: playlist.title,
          headerStyle: { backgroundColor: moodTheme.bg },
          headerTintColor: moodTheme.text,
        }}
      />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.emoji}>{emotion?.emoji}</Text>
        <Text style={styles.title}>{playlist.title}</Text>
        <Text style={styles.desc}>{playlist.description}</Text>

        <View style={styles.previewWrap}>
          <PlaylistShareCard ref={cardRef} model={shareModel} />
        </View>

        <Pressable
          onPress={handleShare}
          disabled={sharing}
          style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}>
          {sharing ?
            <ActivityIndicator color="#fff" />
          : <Text style={styles.btnPrimaryText}>감성 카드 공유하기</Text>}
        </Pressable>

        <Pressable
          onPress={handleReplay}
          style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}>
          <Text style={styles.btnSecondaryText}>▶ 다시 듣기</Text>
        </Pressable>

        <Pressable onPress={handleRemove} style={styles.btnGhost}>
          <Text style={styles.btnGhostText}>저장 목록에서 삭제</Text>
        </Pressable>

        <View style={styles.trackList}>
          <Text style={styles.trackLabel}>곡 목록</Text>
          {playlist.tracks.map((t, i) => (
            <Text key={t.id} style={styles.trackLine} numberOfLines={1}>
              {i + 1}. {t.title} — {t.artist}
            </Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: moodTheme.bg },
  scroll: {
    padding: moodTheme.spacing.screen,
    paddingBottom: 48,
    alignItems: 'center',
    gap: moodTheme.spacing.md,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  muted: { color: moodTheme.textMuted },
  link: { color: moodTheme.primary, fontWeight: '600' },
  emoji: { fontSize: 40 },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: moodTheme.text,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    color: moodTheme.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  previewWrap: {
    marginVertical: moodTheme.spacing.md,
  },
  btnPrimary: {
    width: '100%',
    backgroundColor: moodTheme.primary,
    borderRadius: moodTheme.radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  btnSecondary: {
    width: '100%',
    backgroundColor: moodTheme.surface,
    borderRadius: moodTheme.radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: moodTheme.border,
  },
  btnSecondaryText: {
    color: moodTheme.text,
    fontWeight: '700',
    fontSize: 16,
  },
  btnGhost: {
    paddingVertical: 8,
  },
  btnGhostText: {
    color: moodTheme.textDim,
    fontSize: 14,
  },
  pressed: { opacity: 0.88 },
  trackList: {
    width: '100%',
    marginTop: moodTheme.spacing.lg,
    gap: 6,
  },
  trackLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: moodTheme.textDim,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  trackLine: {
    fontSize: 13,
    color: moodTheme.textMuted,
  },
});
