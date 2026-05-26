import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { trackEvent } from '@/services/analytics/analyticsService';

function dayKey(ts = Date.now()): string {
  return new Date(ts).toISOString().slice(0, 10);
}

type GrowthSessionStore = {
  firstOpenAt: number | null;
  lastOpenAt: number | null;
  lastHomeVisitAt: number | null;
  openCount: number;
  homeVisitCount: number;
  activeDays: string[];
  routineUseCount: number;

  recordAppOpen: () => void;
  recordHomeVisit: () => void;
  recordRoutineUsed: () => void;
  clear: () => void;
};

export const useGrowthSessionStore = create<GrowthSessionStore>()(
  persist(
    (set, get) => ({
      firstOpenAt: null,
      lastOpenAt: null,
      lastHomeVisitAt: null,
      openCount: 0,
      homeVisitCount: 0,
      activeDays: [],
      routineUseCount: 0,

      recordAppOpen: () => {
        const now = Date.now();
        const dk = dayKey(now);
        const days = get().activeDays.includes(dk) ?
          get().activeDays
        : [...get().activeDays, dk].slice(-60);

        set({
          firstOpenAt: get().firstOpenAt ?? now,
          lastOpenAt: now,
          openCount: get().openCount + 1,
          activeDays: days,
        });
      },

      recordHomeVisit: () => {
        const now = Date.now();
        const nextHomeVisits = get().homeVisitCount + 1;
        set({
          lastHomeVisitAt: now,
          homeVisitCount: nextHomeVisits,
        });
        trackEvent('home_screen_view', {
          openCount: get().openCount,
          homeVisitCount: nextHomeVisits,
          daysSinceFirstOpen:
            get().firstOpenAt != null ?
              Math.floor((now - get().firstOpenAt!) / 86_400_000)
            : 0,
        });
      },

      recordRoutineUsed: () => {
        set({ routineUseCount: get().routineUseCount + 1 });
        trackEvent('routine_used', {
          totalRoutineUses: get().routineUseCount + 1,
        });
      },

      clear: () =>
        set({
          firstOpenAt: null,
          lastOpenAt: null,
          lastHomeVisitAt: null,
          openCount: 0,
          homeVisitCount: 0,
          activeDays: [],
          routineUseCount: 0,
        }),
    }),
    {
      name: 'moodplay-growth-session',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
