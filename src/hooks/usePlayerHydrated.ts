import { useEffect, useState } from 'react';

import { usePlayerStore } from '@/stores/playerStore';

/** persist rehydrate 완료 후 true — 홈·복원 UX용 */
export function usePlayerHydrated(): boolean {
  const [hydrated, setHydrated] = useState(
    () => usePlayerStore.persist.hasHydrated()
  );

  useEffect(() => {
    const unsub = usePlayerStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    if (usePlayerStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return unsub;
  }, []);

  return hydrated;
}
