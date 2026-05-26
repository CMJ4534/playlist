import { router, useSegments } from 'expo-router';
import { useEffect, type ReactNode } from 'react';

import { useOnboardingHydrated } from '@/hooks/useOnboardingHydrated';
import { useOnboardingStore } from '@/stores/onboardingStore';

type Props = {
  children: ReactNode;
};

/** 첫 실행 시 온보딩으로 유도 */
export function OnboardingGate({ children }: Props) {
  const hydrated = useOnboardingHydrated();
  const completed = useOnboardingStore((s) => s.hasCompletedOnboarding);
  const segments = useSegments();

  useEffect(() => {
    if (!hydrated || completed) return;
    const root = segments[0];
    if (root === 'onboarding' || root === 'dev') return;
    router.replace('/onboarding');
  }, [hydrated, completed, segments]);

  return children;
}
