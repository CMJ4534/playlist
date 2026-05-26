import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { moodTheme } from '@/constants/moodTheme';
import type { FeedFilter } from '@/types/publicPlaylist';

const FILTERS: { key: FeedFilter; label: string }[] = [
  { key: 'latest', label: '최신' },
  { key: 'popular', label: '인기' },
  { key: 'sad', label: '😔 우울' },
  { key: 'dawn', label: '🌙 새벽' },
  { key: 'focus', label: '🔥 집중' },
  { key: 'rain', label: '🌧 비' },
  { key: 'walk', label: '🚶 산책' },
  { key: 'blank', label: '☁️ 멍' },
];

type Props = {
  active: FeedFilter;
  onChange: (f: FeedFilter) => void;
};

export function FeedFilterBar({ active, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}>
      {FILTERS.map(({ key, label }) => {
        const isActive = key === active;
        return (
          <Pressable
            key={key}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onChange(key)}>
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: moodTheme.spacing.screen,
    paddingVertical: moodTheme.spacing.sm,
    gap: moodTheme.spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: moodTheme.surfaceElevated,
    borderWidth: 1,
    borderColor: moodTheme.border,
  },
  chipActive: {
    backgroundColor: moodTheme.primary,
    borderColor: moodTheme.primary,
  },
  chipText: {
    color: moodTheme.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
});
