import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import YoutubePlayer, {
  PLAYER_STATES,
  type YoutubeIframeRef,
} from 'react-native-youtube-iframe';

import { usePlaybackAppState } from '@/hooks/usePlaybackAppState';
import {
  analyticsOnPlaylistCompleted,
  analyticsOnTrackPlaying,
  analyticsOnTrackSkip,
} from '@/lib/analyticsPlayback';
import { notePlaybackSkip } from '@/lib/playbackDebug';
import {
  isSkippablePlaybackError,
  mapYoutubePlayerError,
} from '@/lib/youtubePlaybackErrors';
import { usePlaybackDebugStore } from '@/stores/playbackDebugStore';
import { selectCurrentYoutubeId } from '@/stores/selectors/playerSelectors';
import { usePlayerStore } from '@/stores/playerStore';

// ─── 상수 ─────────────────────────────────────────
const ENDED_DEBOUNCE_MS = 200;
const LOAD_TIMEOUT_MS = 18_000;
const PROGRESS_POLL_MS = 1_000;

/** onReady 후 play 미시작 시 fallback retry 간격 */
const PLAY_RETRY_DELAY_MS = 600;
const PLAY_RETRY_MAX = 3;

// ─── 디버그 헬퍼 ──────────────────────────────────
const dbg = usePlaybackDebugStore.getState;

function log(tag: string, msg: string) {
  dbg().log(tag, msg);
}

/**
 * 화면에 보이지 않는 YouTube WebView 플레이어.
 *
 * 핵심 수정 사항 (재생 안정화):
 * 1. opacity 0.01 + position absolute (0이면 일부 기기에서 WebView 비활성화)
 * 2. left: -9999 제거 → 화면 밖이면 OS가 렌더링을 건너뛴다
 * 3. forceAndroidAutoplay={true} → Android autoplay 정책 우회
 * 4. onReady 이후에만 play state를 적용하는 readyGate
 * 5. onReady 후 PLAYING 상태 미진입 시 retry fallback
 * 6. 원인별 디버그 로그 전수 출력
 */
export function HiddenYoutubePlayer() {
  usePlaybackAppState();

  const playerRef = useRef<YoutubeIframeRef | null>(null);
  const youtubeId = usePlayerStore(selectCurrentYoutubeId);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const queueRevision = usePlayerStore((s) => s.queueRevision);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const playbackStatus = usePlayerStore((s) => s.playbackStatus);

  const next = usePlayerStore((s) => s.next);
  const setPlaybackStatus = usePlayerStore((s) => s.setPlaybackStatus);
  const setProgress = usePlayerStore((s) => s.setProgress);
  const skipOnPlaybackError = usePlayerStore((s) => s.skipOnPlaybackError);
  const clearPlaybackError = usePlayerStore((s) => s.clearPlaybackError);

  // ── ready gate: iframe onReady 전까지 play prop을 false로 유지 ──
  const [iframeReady, setIframeReady] = useState(false);
  const playRetryRef = useRef(0);
  const playRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const endedHandledRef = useRef(false);
  const endedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── debug store sync ──
  useEffect(() => {
    dbg().setYoutubeId(youtubeId);
  }, [youtubeId]);

  useEffect(() => {
    dbg().setStoreIsPlaying(isPlaying);
  }, [isPlaying]);

  // ── 타이머 정리 ──
  const clearLoadTimeout = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, []);

  const clearPlayRetry = useCallback(() => {
    if (playRetryTimerRef.current) {
      clearTimeout(playRetryTimerRef.current);
      playRetryTimerRef.current = null;
    }
    playRetryRef.current = 0;
  }, []);

  // ── track 변경 시 reset ──
  useEffect(() => {
    endedHandledRef.current = false;
    setIframeReady(false);
    dbg().setIframeReady(false);
    dbg().setIframeState('unstarted');
    clearLoadTimeout();
    clearPlayRetry();

    if (endedTimerRef.current) {
      clearTimeout(endedTimerRef.current);
      endedTimerRef.current = null;
    }

    if (youtubeId) {
      setPlaybackStatus('loading');
      log('track', `loading ${youtubeId} (idx=${currentIndex}, rev=${queueRevision})`);
      dbg().incrementMount();

      loadTimeoutRef.current = setTimeout(() => {
        log('timeout', `${LOAD_TIMEOUT_MS}ms elapsed – skipping`);
        notePlaybackSkip('timeout');
        skipOnPlaybackError('timeout');
      }, LOAD_TIMEOUT_MS);
    }

    return () => {
      clearLoadTimeout();
      clearPlayRetry();
    };
  }, [youtubeId, currentIndex, queueRevision, setPlaybackStatus, skipOnPlaybackError, clearLoadTimeout, clearPlayRetry]);

  // ── cleanup on unmount ──
  useEffect(
    () => () => {
      if (endedTimerRef.current) clearTimeout(endedTimerRef.current);
      clearLoadTimeout();
      clearPlayRetry();
    },
    [clearLoadTimeout, clearPlayRetry]
  );

  // ── progress polling ──
  useEffect(() => {
    if (!isPlaying || !youtubeId || playbackStatus === 'error') return;

    const poll = async () => {
      try {
        const ref = playerRef.current;
        if (!ref) return;
        const [position, duration] = await Promise.all([
          ref.getCurrentTime(),
          ref.getDuration(),
        ]);
        if (Number.isFinite(position)) {
          setProgress(position, Number.isFinite(duration) ? duration : undefined);
        }
      } catch {
        /* WebView not ready */
      }
    };

    const id = setInterval(poll, PROGRESS_POLL_MS);
    poll();
    return () => clearInterval(id);
  }, [isPlaying, youtubeId, playbackStatus, queueRevision, setProgress]);

  // ── onReady 후 play가 실제 시작됐는지 확인하는 fallback ──
  const schedulePlayRetry = useCallback(() => {
    clearPlayRetry();

    const attempt = () => {
      const { isPlaying: nowPlaying, playbackStatus: nowStatus } = usePlayerStore.getState();
      playRetryRef.current += 1;
      const count = playRetryRef.current;

      if (!nowPlaying || nowStatus === 'playing') {
        log('retry', `play retry #${count} — not needed (playing=${nowPlaying}, status=${nowStatus})`);
        return;
      }

      log('retry', `play retry #${count}/${PLAY_RETRY_MAX} — forcing re-trigger`);
      // toggle isPlaying to re-trigger the library's play effect
      usePlayerStore.getState().pause();
      setTimeout(() => {
        usePlayerStore.getState().play();
      }, 100);

      if (count < PLAY_RETRY_MAX) {
        playRetryTimerRef.current = setTimeout(attempt, PLAY_RETRY_DELAY_MS);
      } else {
        log('retry', 'max retries exhausted — playback may have failed');
      }
    };

    playRetryTimerRef.current = setTimeout(attempt, PLAY_RETRY_DELAY_MS);
  }, [clearPlayRetry]);

  // ── callbacks ──
  const onReady = useCallback(() => {
    clearLoadTimeout();
    clearPlaybackError();
    setIframeReady(true);
    dbg().setIframeReady(true);
    usePlayerStore.setState({ consecutiveSkipCount: 0 });

    const nowPlaying = usePlayerStore.getState().isPlaying;
    setPlaybackStatus(nowPlaying ? 'playing' : 'paused');
    log('ready', `iframe ready — isPlaying=${nowPlaying}`);

    // duration 취득
    void (async () => {
      try {
        const duration = await playerRef.current?.getDuration();
        if (duration && Number.isFinite(duration)) {
          setProgress(0, duration);
        }
      } catch {
        /* ignore */
      }
    })();

    // play가 실제 시작됐는지 확인하는 fallback
    if (nowPlaying) {
      schedulePlayRetry();
    }
  }, [clearLoadTimeout, clearPlaybackError, setPlaybackStatus, setProgress, schedulePlayRetry]);

  const onError = useCallback(
    (error: string) => {
      clearLoadTimeout();
      clearPlayRetry();
      const kind = mapYoutubePlayerError(error);
      log('error', `iframe error: ${error} → ${kind}`);
      notePlaybackSkip(`error:${kind}`);
      if (isSkippablePlaybackError(kind)) {
        skipOnPlaybackError(kind);
      } else {
        usePlayerStore.getState().reportPlaybackError(kind);
      }
    },
    [clearLoadTimeout, clearPlayRetry, skipOnPlaybackError]
  );

  const onStateChange = useCallback(
    (state: string) => {
      dbg().setIframeState(state);
      log('state', `iframe → ${state}`);

      if (state === PLAYER_STATES.BUFFERING) {
        setPlaybackStatus('buffering');
        return;
      }

      if (state === PLAYER_STATES.PLAYING) {
        clearLoadTimeout();
        clearPlaybackError();
        clearPlayRetry();
        usePlayerStore.setState({ consecutiveSkipCount: 0 });
        setPlaybackStatus('playing');

        const { currentIndex: idx, queue } = usePlayerStore.getState();
        if (youtubeId) {
          analyticsOnTrackPlaying(youtubeId, idx, queue.length, 'auto_advance');
        }
        return;
      }

      if (state === PLAYER_STATES.PAUSED) {
        setPlaybackStatus('paused');
        return;
      }

      if (state === PLAYER_STATES.ENDED) {
        if (endedHandledRef.current) return;
        endedHandledRef.current = true;

        endedTimerRef.current = setTimeout(() => {
          const { currentIndex: idx, queue } = usePlayerStore.getState();
          const isLast = queue.length > 0 && idx >= queue.length - 1;

          if (isLast) {
            analyticsOnPlaylistCompleted(queue.length, idx);
            usePlayerStore.getState().pause();
            log('ended', 'playlist completed');
          } else {
            notePlaybackSkip('track_ended');
            const endedTrack = usePlayerStore.getState().getCurrentTrack();
            if (endedTrack?.youtubeId) {
              analyticsOnTrackSkip(
                endedTrack.youtubeId,
                idx,
                queue.length,
                'track_ended',
                true
              );
            }
            next({ debugSkipReason: 'track_ended', bypassCooldown: true });
            log('ended', `track ended → next (was idx=${idx})`);
          }
          endedTimerRef.current = null;
        }, ENDED_DEBOUNCE_MS);
      }
    },
    [clearLoadTimeout, clearPlaybackError, clearPlayRetry, next, setPlaybackStatus, youtubeId]
  );

  if (!youtubeId) return null;

  // play prop: iframe이 ready된 후에만 store의 isPlaying을 전달
  const effectivePlay = iframeReady && isPlaying;

  return (
    <View style={styles.hidden} pointerEvents="none">
      <YoutubePlayer
        ref={playerRef}
        key={`${youtubeId}-${currentIndex}-${queueRevision}`}
        height={200}
        width={200}
        play={effectivePlay}
        videoId={youtubeId}
        onReady={onReady}
        onError={onError}
        onChangeState={onStateChange}
        forceAndroidAutoplay={true}
        webViewProps={{
          mediaPlaybackRequiresUserAction: false,
          allowsInlineMediaPlayback: true,
          ...(Platform.OS === 'android' && {
            mixedContentMode: 'compatibility' as const,
            androidLayerType: 'hardware' as const,
          }),
        }}
        initialPlayerParams={{
          controls: 0,
          modestbranding: true,
          preventFullScreen: true,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * 재생 안정화 핵심 스타일:
   * - opacity 0.01 (0이면 WebView가 비활성화되어 오디오 출력 안 됨)
   * - position absolute, top/left 0 (left:-9999는 OS가 렌더링을 건너뜀)
   * - pointerEvents 'none'은 부모 View에 설정
   * - overflow hidden으로 시각적으로 완전히 숨김
   */
  hidden: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 200,
    height: 200,
    opacity: 0.01,
    overflow: 'hidden',
  },
});
