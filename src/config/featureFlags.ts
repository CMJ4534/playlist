import { isBetaQaEnabled } from '@/constants/beta';
import { isDevEnvironment } from '@/constants/dev';
import { getRemoteConfigSnapshot } from '@/config/remoteConfig';

export type FeatureFlags = {
  enablePlaylistFeedbackPrompt: boolean;
  enableLikeSave: boolean;
  enableBetaQa: boolean;
  enablePlaybackDebug: boolean;
};

/**
 * Feature flags — env + remote config 병합.
 * 베타: remote config cache만 갱신해도 앱 재시작 없이 일부 토글 가능.
 */
export function getFeatureFlags(): FeatureFlags {
  const remote = getRemoteConfigSnapshot();

  return {
    enablePlaylistFeedbackPrompt:
      remote.flags.enablePlaylistFeedbackPrompt ?? true,
    enableLikeSave: remote.flags.enableLikeSave ?? true,
    enableBetaQa: isDevEnvironment() || isBetaQaEnabled() || remote.flags.enableBetaQa,
    enablePlaybackDebug:
      isDevEnvironment() ||
      process.env.EXPO_PUBLIC_PLAYBACK_DEBUG === '1' ||
      remote.flags.enablePlaybackDebug,
  };
}

export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return getFeatureFlags()[flag];
}
