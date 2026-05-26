import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { usePlaybackDebugStore } from '@/stores/playbackDebugStore';
import { usePlayerStore } from '@/stores/playerStore';

/**
 * 앱이 background로 가면 재생 UI를 pause와 맞추고,
 * foreground 복귀 시 이전에 재생 중이었다면 resume한다.
 *
 * 수정: playbackStatus === 'error'일 때는 resume하지 않음
 */
export function usePlaybackAppState() {
  const shouldResumeRef = useRef(false);

  useEffect(() => {
    const onChange = (nextState: AppStateStatus) => {
      const { isPlaying, playbackStatus, pause, play } = usePlayerStore.getState();

      if (nextState === 'background' || nextState === 'inactive') {
        if (isPlaying) {
          shouldResumeRef.current = true;
          pause();
          usePlaybackDebugStore.getState().log('appState', 'background → paused');
        }
        return;
      }

      if (nextState === 'active' && shouldResumeRef.current) {
        shouldResumeRef.current = false;
        if (playbackStatus === 'error') {
          usePlaybackDebugStore.getState().log('appState', 'foreground — skip resume (error state)');
          return;
        }
        play();
        usePlaybackDebugStore.getState().log('appState', 'foreground → resumed');
      }
    };

    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);
}
