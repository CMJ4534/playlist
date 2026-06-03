import { useEffect, useState } from 'react';

import { useTastePreferencesStore } from '@/stores/tastePreferencesStore';

export function useTastePreferencesHydrated(): boolean {
  const [hydrated, setHydrated] = useState(
    () => useTastePreferencesStore.persist.hasHydrated()
  );

  useEffect(() => {
    const unsub = useTastePreferencesStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    if (useTastePreferencesStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  return hydrated;
}
