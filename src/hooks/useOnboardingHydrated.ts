import { useEffect, useState } from 'react';

import { useOnboardingStore } from '@/stores/onboardingStore';

export function useOnboardingHydrated(): boolean {
  const [hydrated, setHydrated] = useState(
    () => useOnboardingStore.persist.hasHydrated()
  );

  useEffect(() => {
    const unsub = useOnboardingStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    if (useOnboardingStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  return hydrated;
}
