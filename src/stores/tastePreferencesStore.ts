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
    }
  )
);

/** 추천 API body용 */
export function getTastePreferencesPayload(): TastePreferencesPayload | null {
  const { favoriteGenres, favoriteArtists, hasCompletedTasteOnboarding } =
    useTastePreferencesStore.getState();

  if (!hasCompletedTasteOnboarding || favoriteGenres.length === 0) {
    return null;
  }

  const artists = favoriteArtists.map((a) => a.trim()) as [string, string, string];
  if (artists.some((a) => !a)) return null;

  return { favoriteGenres, favoriteArtists: artists };
}
