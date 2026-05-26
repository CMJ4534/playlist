import { StyleSheet, View } from 'react-native';

import { moodTheme } from '@/constants/moodTheme';

type Props = {
  progress: number;
  buffered?: number;
  variant?: 'mini' | 'full';
};

/** 0~1 진행률 — MiniPlayer / FullPlayer 공용 */
export function PlayerProgressBar({
  progress,
  buffered = 0,
  variant = 'mini',
}: Props) {
  const clamped = Math.min(1, Math.max(0, progress));
  const bufferedClamped = Math.min(1, Math.max(clamped, buffered));

  return (
    <View
      style={[styles.track, variant === 'mini' ? styles.trackMini : styles.trackFull]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}>
      <View style={[styles.buffered, { width: `${bufferedClamped * 100}%` }]} />
      <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  trackMini: {
    width: '100%',
  },
  trackFull: {
    width: '100%',
    height: 4,
    marginTop: 20,
  },
  buffered: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: moodTheme.primary,
  },
});
