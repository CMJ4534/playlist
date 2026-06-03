import { useCallback, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { MUSIC_GENRES } from '@/constants/musicGenres';
import { moodTheme } from '@/constants/moodTheme';
import type { MusicGenreId } from '@/types/tastePreferences';

type Props = {
  initialGenres?: MusicGenreId[];
  initialArtists?: [string, string, string];
  onSubmit: (
    genres: MusicGenreId[],
    artists: [string, string, string]
  ) => void;
  submitLabel?: string;
};

export function TastePreferencesForm({
  initialGenres = [],
  initialArtists = ['', '', ''],
  onSubmit,
  submitLabel = '저장',
}: Props) {
  const [selectedGenres, setSelectedGenres] = useState<MusicGenreId[]>(initialGenres);
  const [artists, setArtists] = useState<[string, string, string]>([
    initialArtists[0] ?? '',
    initialArtists[1] ?? '',
    initialArtists[2] ?? '',
  ]);
  const [error, setError] = useState<string | null>(null);

  const toggleGenre = useCallback((id: MusicGenreId) => {
    setSelectedGenres((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
    setError(null);
  }, []);

  const setArtistAt = (index: 0 | 1 | 2, value: string) => {
    setArtists((prev) => {
      const next: [string, string, string] = [...prev];
      next[index] = value;
      return next;
    });
    setError(null);
  };

  const handleSubmit = () => {
    if (selectedGenres.length === 0) {
      setError('좋아하는 장르를 하나 이상 선택해 주세요.');
      return;
    }
    const trimmed = artists.map((a) => a.trim()) as [string, string, string];
    if (trimmed.some((a) => !a)) {
      setError('좋아하는 아티스트 3명을 모두 입력해 주세요.');
      return;
    }
    onSubmit(selectedGenres, trimmed);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionTitle}>좋아하는 장르</Text>
      <Text style={styles.sectionHint}>복수 선택 가능</Text>
      <View style={styles.chipRow}>
        {MUSIC_GENRES.map((genre) => {
          const active = selectedGenres.includes(genre.id);
          return (
            <Pressable
              key={genre.id}
              onPress={() => toggleGenre(genre.id)}
              style={({ pressed }) => [
                styles.chip,
                active && styles.chipActive,
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {genre.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.sectionTitle, styles.sectionGap]}>좋아하는 아티스트 3명</Text>
      {([0, 1, 2] as const).map((i) => (
        <TextInput
          key={i}
          style={styles.input}
          placeholder={`아티스트 ${i + 1}`}
          placeholderTextColor={moodTheme.textDim}
          value={artists[i]}
          onChangeText={(v) => setArtistAt(i, v)}
          autoCapitalize="none"
          autoCorrect={false}
        />
      ))}

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <Pressable
        onPress={handleSubmit}
        style={({ pressed }) => [styles.submitBtn, pressed && styles.pressed]}>
        <Text style={styles.submitText}>{submitLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: moodTheme.text,
  },
  sectionHint: {
    fontSize: 13,
    color: moodTheme.textDim,
    marginBottom: 4,
  },
  sectionGap: { marginTop: 16 },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: moodTheme.border,
    backgroundColor: moodTheme.surfaceElevated,
  },
  chipActive: {
    borderColor: moodTheme.primary,
    backgroundColor: 'rgba(139, 124, 255, 0.2)',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: moodTheme.textMuted,
  },
  chipTextActive: {
    color: moodTheme.text,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: moodTheme.border,
    backgroundColor: moodTheme.surfaceElevated,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: moodTheme.text,
    marginTop: 8,
  },
  error: {
    fontSize: 14,
    color: '#FF8A8A',
    marginTop: 4,
  },
  submitBtn: {
    marginTop: 20,
    backgroundColor: moodTheme.primary,
    borderRadius: moodTheme.radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  pressed: { opacity: 0.88 },
});
