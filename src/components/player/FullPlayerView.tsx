import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { moodTheme } from '@/constants/moodTheme';
import { usePlayer } from '@/hooks/usePlayer';

/** 전체 Player 화면 본문 — MiniPlayer와 동일 store 사용 */
export function FullPlayerView() {
  const { track, isPlaying, queue, currentIndex, togglePlay, next, prev } =
    usePlayer();

  if (!track) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>재생 중인 곡이 없습니다</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={{ uri: track.thumbnailUrl }} style={styles.artwork} />
      <Text style={styles.title}>{track.title}</Text>
      <Text style={styles.artist}>{track.artist}</Text>
      <Text style={styles.meta}>
        {currentIndex + 1} / {queue.length}
      </Text>

      <View style={styles.controls}>
        <Pressable
          onPress={prev}
          style={({ pressed }) => [styles.sideBtn, pressed && styles.btnPressed]}
          accessibilityLabel="이전 곡">
          <FontAwesome name="step-backward" size={28} color={moodTheme.text} />
        </Pressable>

        <Pressable
          onPress={togglePlay}
          style={({ pressed }) => [styles.playBtn, pressed && styles.playBtnPressed]}
          accessibilityLabel={isPlaying ? '일시정지' : '재생'}>
          <FontAwesome
            name={isPlaying ? 'pause' : 'play'}
            size={32}
            color="#fff"
            style={!isPlaying ? styles.playIconOffset : undefined}
          />
        </Pressable>

        <Pressable
          onPress={() => next()}
          style={({ pressed }) => [styles.sideBtn, pressed && styles.btnPressed]}
          accessibilityLabel="다음 곡">
          <FontAwesome name="step-forward" size={28} color={moodTheme.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    backgroundColor: moodTheme.bg,
  },
  artwork: {
    width: '100%',
    maxWidth: 320,
    aspectRatio: 1,
    borderRadius: 16,
    marginBottom: 28,
    backgroundColor: moodTheme.surfaceElevated,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.45,
        shadowRadius: 24,
      },
      android: { elevation: 12 },
    }),
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: moodTheme.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  artist: {
    fontSize: 17,
    color: moodTheme.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  meta: {
    fontSize: 14,
    color: moodTheme.textDim,
    marginTop: 12,
    marginBottom: 36,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  sideBtn: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
  },
  btnPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: moodTheme.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnPressed: {
    backgroundColor: moodTheme.primaryPressed,
  },
  playIconOffset: {
    marginLeft: 4,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: moodTheme.bg,
  },
  emptyText: {
    color: moodTheme.textMuted,
  },
});
