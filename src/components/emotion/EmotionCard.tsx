import { Pressable, StyleSheet, Text, View } from 'react-native';

import { moodTheme } from '@/constants/moodTheme';
import type { Emotion } from '@/types/emotion';

type Props = {
  emotion: Emotion;
  selected: boolean;
  onPress: () => void;
};

export function EmotionCard({ emotion, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        selected && { borderColor: emotion.accent, backgroundColor: `${emotion.accent}22` },
        pressed && styles.pressed,
        !selected && pressed && styles.pressedUnselected,
      ]}>
      <Text style={styles.emoji}>{emotion.emoji}</Text>
      <Text style={[styles.label, selected && { color: moodTheme.text }]}>
        {emotion.label}
      </Text>
      {selected ? <View style={[styles.dot, { backgroundColor: emotion.accent }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '47%',
    aspectRatio: 1.15,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: moodTheme.border,
    backgroundColor: moodTheme.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
  },
  pressed: {
    opacity: 0.92,
  },
  pressedUnselected: {
    backgroundColor: moodTheme.surfaceElevated,
  },
  emoji: {
    fontSize: 32,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: moodTheme.textMuted,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    top: 12,
    right: 12,
  },
});
