import { router, useSegments } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { moodTheme } from '@/constants/moodTheme';
import { useOnboardingHydrated } from '@/hooks/useOnboardingHydrated';
import { useTastePreferencesHydrated } from '@/hooks/useTastePreferencesHydrated';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useTastePreferencesStore } from '@/stores/tastePreferencesStore';

type Props = {
  children: ReactNode;
};

function isOnboardingRoute(root: string | undefined, sub: string | undefined): boolean {
  return root === 'onboarding' && (sub === 'taste' || sub === 'index' || sub === undefined);
}

/** 소개 온보딩 → 취향 온보딩 → 앱 본 화면 */
export function OnboardingGate({ children }: Props) {
  const introHydrated = useOnboardingHydrated();
  const tasteHydrated = useTastePreferencesHydrated();
  const introDone = useOnboardingStore((s) => s.hasCompletedOnboarding);
  const tasteComplete = useTastePreferencesStore(
    (s) =>
      s.hasCompletedTasteOnboarding &&
      s.favoriteGenres.length > 0 &&
      s.favoriteArtists.every((a) => a.trim().length > 0)
  );
  const segments = useSegments();

  const hydrated = introHydrated && tasteHydrated;
  const root = segments[0];
  const sub = segments[1];
  const onDev = root === 'dev';
  const onOnboarding = isOnboardingRoute(root, sub);
  const onTaste = root === 'onboarding' && sub === 'taste';
  const onIntro = root === 'onboarding' && sub !== 'taste';

  useEffect(() => {
    if (!hydrated || onDev) return;

    if (!introDone) {
      if (!onIntro) router.replace('/onboarding');
      return;
    }

    if (!tasteComplete) {
      if (!onTaste) router.replace('/onboarding/taste');
    }
  }, [hydrated, onDev, introDone, tasteComplete, onIntro, onTaste]);

  if (!hydrated) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={moodTheme.primary} />
      </View>
    );
  }

  if (!onDev && ((!introDone && !onOnboarding) || (introDone && !tasteComplete && !onTaste))) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator color={moodTheme.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: moodTheme.bg,
  },
});
