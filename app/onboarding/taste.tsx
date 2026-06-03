import { router, Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TastePreferencesForm } from '@/components/taste/TastePreferencesForm';
import { moodTheme, moodTypography } from '@/constants/moodTheme';
import { useTastePreferencesStore } from '@/stores/tastePreferencesStore';
import type { MusicGenreId } from '@/types/tastePreferences';

export default function TasteOnboardingScreen() {
  const { favoriteGenres, favoriteArtists, setTastePreferences, completeTasteOnboarding } =
    useTastePreferencesStore();

  const handleSubmit = (
    genres: MusicGenreId[],
    artists: [string, string, string]
  ) => {
    setTastePreferences(genres, artists);
    completeTasteOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={styles.emoji}>🎧</Text>
        <Text style={styles.heading}>나만의 음악 취향</Text>
        <Text style={styles.sub}>
          한 번만 설정하면 이후 추천에 반영돼요.{'\n'}
          감정과 일기에 맞춰 더 잘 맞는 곡을 골라 드릴게요.
        </Text>

        <TastePreferencesForm
          initialGenres={favoriteGenres}
          initialArtists={favoriteArtists}
          onSubmit={handleSubmit}
          submitLabel="시작하기"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: moodTheme.bg },
  scroll: {
    paddingHorizontal: moodTheme.spacing.screen,
    paddingBottom: 32,
    paddingTop: 16,
  },
  emoji: { fontSize: 40, marginBottom: 8 },
  heading: {
    ...moodTypography.title,
    color: moodTheme.text,
    marginBottom: 8,
  },
  sub: {
    ...moodTypography.body,
    color: moodTheme.textMuted,
    lineHeight: 22,
    marginBottom: 24,
  },
});
