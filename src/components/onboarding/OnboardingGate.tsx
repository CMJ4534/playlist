import { router, useSegments } from 'expo-router';
import { useEffect, type ReactNode } from 'react';

import { useOnboardingHydrated } from '@/hooks/useOnboardingHydrated';
import { useTastePreferencesHydrated } from '@/hooks/useTastePreferencesHydrated';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useTastePreferencesStore } from '@/stores/tastePreferencesStore';

type Props = {
  children: ReactNode;
};

/** 소개 온보딩 → 취향 온보딩 → 앱 본 화면 */
export function OnboardingGate({ children }: Props) {
  const introHydrated = useOnboardingHydrated();
  const tasteHydrated = useTastePreferencesHydrated();
  const introDone = useOnboardingStore((s) => s.hasCompletedOnboarding);
  const tasteDone = useTastePreferencesStore((s) => s.hasCompletedTasteOnboarding);
  const segments = useSegments();

  useEffect(() => {
    if (!introHydrated || !tasteHydrated) return;

    const root = segments[0];
    const sub = segments[1];

    if (root === 'dev') return;

    const onIntro = root === 'onboarding' && sub !== 'taste';
    const onTaste = root === 'onboarding' && sub === 'taste';

    if (!introDone) {
      if (!onIntro) router.replace('/onboarding');
      return;
    }

    if (!tasteDone) {
      if (!onTaste) router.replace('/onboarding/taste');
      return;
    }
  }, [introHydrated, tasteHydrated, introDone, tasteDone, segments]);

  return <>{children}</>;
}
