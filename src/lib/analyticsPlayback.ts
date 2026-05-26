import { isFeatureEnabled } from '@/config/featureFlags';
import { recordListeningSignal } from '@/lib/listeningSignals';
import { useFeedbackPromptStore } from '@/stores/feedbackPromptStore';
import {
  createPlaylistSessionId,
  getPlaybackSession,
  recordTrackPlayed,
  recordTrackSkip,
  startPlaybackSession,
} from '@/services/analytics/analyticsContext';
import { trackEvent } from '@/services/analytics/analyticsService';
import { usePlayerStore } from '@/stores/playerStore';
import type { EmotionId } from '@/types/emotion';
import type { PlaybackErrorKind } from '@/types/playback';
import type { Track } from '@/types/track';

export function analyticsOnQueueStart(
  tracks: Track[],
  startIndex: number,
  emotionId?: EmotionId
): void {
  const playlistSessionId = createPlaylistSessionId();
  startPlaybackSession(playlistSessionId, emotionId);

  const track = tracks[startIndex];
  if (!track?.youtubeId) return;

  recordTrackPlayed(track.youtubeId);
  recordListeningSignal(track, 'play', emotionId);
  trackEvent('track_play', {
    youtubeId: track.youtubeId,
    trackIndex: startIndex,
    queueLength: tracks.length,
    playlistSessionId,
    emotionId,
    trigger: 'queue_start',
  });
}

function findTrackInQueue(youtubeId: string): Track | undefined {
  return usePlayerStore.getState().queue.find((t) => t.youtubeId === youtubeId);
}

export function analyticsOnTrackPlaying(
  youtubeId: string,
  trackIndex: number,
  queueLength: number,
  trigger: 'auto_advance' | 'resume'
): void {
  const session = getPlaybackSession();
  if (!session) return;
  if (session.tracksPlayed.has(youtubeId)) return;

  recordTrackPlayed(youtubeId);
  recordListeningSignal(findTrackInQueue(youtubeId), 'play', session.emotionId);
  trackEvent('track_play', {
    youtubeId,
    trackIndex,
    queueLength,
    playlistSessionId: session.playlistSessionId,
    emotionId: session.emotionId,
    trigger,
  });
}

export function analyticsOnTrackSkip(
  youtubeId: string,
  trackIndex: number,
  queueLength: number,
  reason: string,
  isAutoSkip: boolean
): void {
  const session = getPlaybackSession();
  if (!session) return;

  recordTrackSkip();
  recordListeningSignal(findTrackInQueue(youtubeId), 'skip', session.emotionId);
  trackEvent('track_skip', {
    youtubeId,
    trackIndex,
    queueLength,
    playlistSessionId: session.playlistSessionId,
    emotionId: session.emotionId,
    reason,
    isAutoSkip,
  });
}

export function analyticsOnPlaybackError(
  youtubeId: string,
  kind: PlaybackErrorKind,
  trackIndex: number,
  consecutiveSkips: number
): void {
  const session = getPlaybackSession();
  trackEvent('playback_error', {
    youtubeId,
    kind,
    trackIndex,
    playlistSessionId: session?.playlistSessionId ?? 'unknown',
    emotionId: session?.emotionId,
    consecutiveSkips,
  });
}

export function analyticsOnPlaylistCompleted(
  queueLength: number,
  trackIndex: number
): void {
  const session = getPlaybackSession();
  if (!session) return;

  const current = usePlayerStore.getState().getCurrentTrack();
  recordListeningSignal(current, 'complete', session.emotionId);

  trackEvent('playlist_completed', {
    playlistSessionId: session.playlistSessionId,
    emotionId: session.emotionId,
    queueLength,
    tracksPlayed: session.tracksPlayed.size,
    skipCount: session.skipCount,
    durationMs: Date.now() - session.startedAt,
  });

  if (isFeatureEnabled('enablePlaylistFeedbackPrompt')) {
    useFeedbackPromptStore.getState().requestPrompt({
      playlistSessionId: session.playlistSessionId,
      emotionId: session.emotionId,
      trigger: 'playlist_completed',
    });
  }
}
