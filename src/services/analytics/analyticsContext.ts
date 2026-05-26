import type { EmotionId } from '@/types/emotion';

export type PlaybackSessionContext = {
  playlistSessionId: string;
  emotionId?: EmotionId;
  startedAt: number;
  skipCount: number;
  tracksPlayed: Set<string>;
};

let playbackSession: PlaybackSessionContext | null = null;

export function startPlaybackSession(
  playlistSessionId: string,
  emotionId?: EmotionId
): PlaybackSessionContext {
  playbackSession = {
    playlistSessionId,
    emotionId,
    startedAt: Date.now(),
    skipCount: 0,
    tracksPlayed: new Set(),
  };
  return playbackSession;
}

export function getPlaybackSession(): PlaybackSessionContext | null {
  return playbackSession;
}

export function recordTrackPlayed(youtubeId: string): void {
  playbackSession?.tracksPlayed.add(youtubeId);
}

export function recordTrackSkip(): void {
  if (playbackSession) playbackSession.skipCount += 1;
}

export function endPlaybackSession(): PlaybackSessionContext | null {
  const session = playbackSession;
  playbackSession = null;
  return session;
}

export function createPlaylistSessionId(): string {
  return `pls_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
