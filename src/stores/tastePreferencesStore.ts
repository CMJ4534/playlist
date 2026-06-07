import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { MusicGenreId, TastePreferencesPayload } from '@/types/tastePreferences';

type TastePreferencesStore = TastePreferencesPayload & {
  hasCompletedTasteOnboarding: boolean;
  completedAt: number | null;
  setTastePreferences: (
    favoriteGenres: MusicGenreId[],
    favoriteArtists: [string, string, string]
  ) => void;
  completeTasteOnboarding: () => void;
  resetTasteOnboarding: () => void;
};

const EMPTY_ARTISTS: [string, string, string] = ['', '', ''];

function hasValidTasteData(state: {
  favoriteGenres: MusicGenreId[];
  favoriteArtists: [string, string, string];
}): boolean {
  if (state.favoriteGenres.length === 0) return false;
  return state.favoriteArtists.every((a) => a.trim().length > 0);
}

/** 온보딩 게이트 — 플래그 + 실제 입력값 모두 확인 */
export function isTasteProfileComplete(): boolean {
  const state = useTastePreferencesStore.getState();
  return state.hasCompletedTasteOnboarding && hasValidTasteData(state);
}

export const useTastePreferencesStore = create<TastePreferencesStore>()(
  persist(
    (set) => ({
      favoriteGenres: [],
      favoriteArtists: [...EMPTY_ARTISTS],
      hasCompletedTasteOnboarding: false,
      completedAt: null,

      setTastePreferences: (favoriteGenres, favoriteArtists) => {
        set({
          favoriteGenres,
          favoriteArtists: favoriteArtists.map((a) => a.trim()) as [
            string,
            string,
            string,
          ],
        });
      },

      completeTasteOnboarding: () => {
        set({
          hasCompletedTasteOnboarding: true,
          completedAt: Date.now(),
        });
      },

      resetTasteOnboarding: () => {
        set({
          favoriteGenres: [],
          favoriteArtists: [...EMPTY_ARTISTS],
          hasCompletedTasteOnboarding: false,
          completedAt: null,
        });
      },
    }),
    {
      name: 'moodplay-taste-preferences',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (!state?.hasCompletedTasteOnboarding) return;
        if (!hasValidTasteData(state)) {
          state.hasCompletedTasteOnboarding = false;
          state.completedAt = null;
        }
      },
    }
  )
);

/** 추천 API body용 */
export function getTastePreferencesPayload(): TastePreferencesPayload | null {
  const { favoriteGenres, favoriteArtists } = useTastePreferencesStore.getState();

  if (!isTasteProfileComplete()) {
    return null;
  }

  const artists = favoriteArtists.map((a) => a.trim()) as [string, string, string];
  return { favoriteGenres, favoriteArtists: artists };
}
