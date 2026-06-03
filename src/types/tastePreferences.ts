export type MusicGenreId =
  | 'kpop'
  | 'ballad'
  | 'hiphop'
  | 'rnb'
  | 'indie'
  | 'pop'
  | 'rock'
  | 'jazz'
  | 'classical';

/** API·Gemini 전달용 */
export type TastePreferencesPayload = {
  favoriteGenres: MusicGenreId[];
  favoriteArtists: [string, string, string];
};

export type TastePreferencesPersisted = TastePreferencesPayload & {
  version: 1;
  completedAt: number | null;
  hasCompletedTasteOnboarding: boolean;
};
