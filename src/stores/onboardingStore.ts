import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type OnboardingStore = {
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false }),
    }),
    {
      name: 'moodplay-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
