import type { MusicGenreId } from '@/types/tastePreferences';

export const MUSIC_GENRES: ReadonlyArray<{ id: MusicGenreId; label: string }> = [
  { id: 'kpop', label: 'K-POP' },
  { id: 'ballad', label: '발라드' },
  { id: 'hiphop', label: '힙합' },
  { id: 'rnb', label: 'R&B' },
  { id: 'indie', label: '인디' },
  { id: 'pop', label: '팝' },
  { id: 'rock', label: '락' },
  { id: 'jazz', label: '재즈' },
  { id: 'classical', label: '클래식' },
] as const;

export function getGenreLabel(id: MusicGenreId): string {
  return MUSIC_GENRES.find((g) => g.id === id)?.label ?? id;
}

export function getGenreLabels(ids: MusicGenreId[]): string {
  return ids.map(getGenreLabel).join(', ');
}
