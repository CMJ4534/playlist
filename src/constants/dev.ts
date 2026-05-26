/**
 * DEV 전용 기능 게이트 (__DEV__ + 선택적 env 오버라이드)
 */
export function isDevEnvironment(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}

/**
 * Playback debug overlay + console logging.
 * DEV 모드에서 기본 활성화. EXPO_PUBLIC_PLAYBACK_DEBUG=0 으로 끌 수 있다.
 */
export function isPlaybackDebugEnabled(): boolean {
  if (!isDevEnvironment()) return false;
  const flag = process.env.EXPO_PUBLIC_PLAYBACK_DEBUG;
  if (flag === '0' || flag === 'false') return false;
  return true;
}
