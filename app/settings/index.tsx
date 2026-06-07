import Constants from 'expo-constants';
import { Link, Stack, router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { isBetaQaEnabled } from '@/constants/beta';
import { moodTheme } from '@/constants/moodTheme';
import { LIBRARY_LIST_HREF } from '@/lib/navigation';
import { useTastePreferencesStore } from '@/stores/tastePreferencesStore';

export default function SettingsScreen() {
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const env =
    process.env.EXPO_PUBLIC_APP_ENV ?? process.env.APP_ENV ?? 'development';
  const showBeta = isBetaQaEnabled();

  const openTasteOnboarding = () => {
    useTastePreferencesStore.getState().resetTasteOnboarding();
    router.push('/onboarding/taste');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: '설정',
          headerStyle: { backgroundColor: moodTheme.bg },
          headerTintColor: moodTheme.text,
        }}
      />
      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.label}>앱 버전</Text>
          <Text style={styles.value}>{version}</Text>
          <Text style={[styles.label, styles.mt]}>환경</Text>
          <Text style={styles.value}>{env}</Text>
        </View>

        <Link href={LIBRARY_LIST_HREF} asChild>
          <Pressable style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}>
            <Text style={styles.linkTitle}>저장한 플레이리스트</Text>
            <Text style={styles.linkSub}>다시 듣기 · 감성 카드 공유</Text>
          </Pressable>
        </Link>

        <Pressable
          onPress={openTasteOnboarding}
          style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}>
          <Text style={styles.linkTitle}>내 음악 취향</Text>
          <Text style={styles.linkSub}>장르 · 좋아하는 아티스트 다시 설정</Text>
        </Pressable>

        {showBeta ?
          <Link href="/dev" asChild>
            <Pressable style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}>
              <Text style={styles.linkTitle}>Beta QA / Dev</Text>
              <Text style={styles.linkSub}>진단 · analytics export · 로컬 초기화</Text>
            </Pressable>
          </Link>
        : null}

        <Text style={styles.footnote}>
          음악은 YouTube로 재생됩니다. 문제가 있으면 베타 빌드의 Beta QA에서 로그를
         보낼 수 있어요.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: moodTheme.bg,
  },
  body: {
    padding: moodTheme.spacing.screen,
    gap: moodTheme.spacing.lg,
  },
  card: {
    backgroundColor: moodTheme.surface,
    borderRadius: moodTheme.radius.lg,
    borderWidth: 1,
    borderColor: moodTheme.border,
    padding: moodTheme.spacing.md,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: moodTheme.textDim,
    textTransform: 'uppercase',
  },
  mt: {
    marginTop: moodTheme.spacing.md,
  },
  value: {
    fontSize: 16,
    color: moodTheme.text,
    marginTop: 4,
    fontWeight: '600',
  },
  linkRow: {
    backgroundColor: moodTheme.surface,
    borderRadius: moodTheme.radius.lg,
    borderWidth: 1,
    borderColor: moodTheme.border,
    padding: moodTheme.spacing.md,
    gap: 4,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: moodTheme.primary,
  },
  linkSub: {
    fontSize: 13,
    color: moodTheme.textMuted,
  },
  footnote: {
    fontSize: 13,
    color: moodTheme.textDim,
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.88,
  },
});
