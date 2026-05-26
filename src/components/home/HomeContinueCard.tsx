import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { moodTheme } from '@/constants/moodTheme';
import { usePlayerStore } from '@/stores/playerStore';

type Props = {
  title: string;
  artist: string;
  index: number;
  total: number;
  isPlaying: boolean;
};

export function HomeContinueCard({ title, artist, index, total, isPlaying }: Props) {
  const play = usePlayerStore((s) => s.play);

  const handlePress = () => {
    play();
    router.push('/player');
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.row}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{isPlaying ? '재생 중' : '이어 듣기'}</Text>
        </View>
        <Text style={styles.progress}>
          {index + 1} / {total}
        </Text>
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.artist} numberOfLines={1}>
        {artist}
      </Text>
      <Text style={styles.hint}>탭하면 전체 플레이어로 이어집니다</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: moodTheme.spacing.md,
    borderRadius: moodTheme.radius.lg,
    backgroundColor: moodTheme.surfaceElevated,
    borderWidth: 1,
    borderColor: moodTheme.primary + '44',
    gap: 6,
  },
  pressed: { opacity: 0.9 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: moodTheme.primary + '33',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: moodTheme.radius.sm,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: moodTheme.primary,
    letterSpacing: 0.4,
  },
  progress: {
    fontSize: 12,
    color: moodTheme.textMuted,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: moodTheme.text,
    marginTop: 4,
  },
  artist: {
    fontSize: 14,
    color: moodTheme.textMuted,
  },
  hint: {
    fontSize: 12,
    color: moodTheme.textDim,
    marginTop: 4,
  },
});
