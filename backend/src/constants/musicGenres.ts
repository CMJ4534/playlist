const GENRE_LABELS: Record<string, string> = {
  kpop: 'K-POP',
  ballad: '발라드',
  hiphop: '힙합',
  rnb: 'R&B',
  indie: '인디',
  pop: '팝',
  rock: '락',
  jazz: '재즈',
  classical: '클래식',
};

export function getGenreLabels(ids: string[]): string {
  return ids.map((id) => GENRE_LABELS[id] ?? id).join(', ');
}
