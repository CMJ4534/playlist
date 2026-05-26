import type { Emotion } from '@/types/emotion';

export const EMOTIONS: Emotion[] = [
  { id: 'sad', emoji: '😔', label: '우울', accent: '#6B7FD7' },
  { id: 'dawn', emoji: '🌙', label: '새벽감성', accent: '#9B8CFF' },
  { id: 'focus', emoji: '🔥', label: '집중', accent: '#FF8A5C' },
  { id: 'rain', emoji: '🌧', label: '비오는날', accent: '#5BA8C9' },
  { id: 'walk', emoji: '🚶', label: '혼자걷기', accent: '#7BC9A4' },
  { id: 'blank', emoji: '☁️', label: '멍때리기', accent: '#A8B0C4' },
];

export const LOADING_MESSAGES = [
  '🎵 감정을 읽는 중...',
  '🌙 오늘 밤 어울리는 음악을 찾는 중...',
  '✨ 지금 이 순간에 맞는 곡을 고르는 중...',
] as const;
