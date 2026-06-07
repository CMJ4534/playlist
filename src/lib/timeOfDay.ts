import type { TimeOfDay } from '@/types/moodStrategy';

/** 로컬 시각 기준 시간대 */
export function getTimeOfDay(date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 0 && hour < 5) return 'latenight';
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}
