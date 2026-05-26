import { create } from 'zustand';

export type PlaybackDebugEntry = {
  ts: number;
  tag: string;
  message: string;
};

type PlaybackDebugState = {
  entries: PlaybackDebugEntry[];
  /** iframe ready 여부 */
  iframeReady: boolean;
  /** 현재 youtubeId */
  youtubeId: string | null;
  /** store isPlaying */
  storeIsPlaying: boolean;
  /** iframe 보고 상태 */
  iframeState: string;
  /** 마지막 skip 사유 */
  lastSkipReason: string | null;
  /** 마지막 에러 */
  lastError: string | null;
  /** mount 횟수 (remount 과도 여부 감시) */
  mountCount: number;
};

type PlaybackDebugActions = {
  log: (tag: string, message: string) => void;
  setIframeReady: (ready: boolean) => void;
  setYoutubeId: (id: string | null) => void;
  setStoreIsPlaying: (playing: boolean) => void;
  setIframeState: (state: string) => void;
  noteSkip: (reason: string) => void;
  noteError: (message: string) => void;
  incrementMount: () => void;
  reset: () => void;
};

const MAX_ENTRIES = 80;

export const usePlaybackDebugStore = create<PlaybackDebugState & PlaybackDebugActions>()(
  (set, get) => ({
    entries: [],
    iframeReady: false,
    youtubeId: null,
    storeIsPlaying: false,
    iframeState: 'unstarted',
    lastSkipReason: null,
    lastError: null,
    mountCount: 0,

    log: (tag, message) => {
      const entry: PlaybackDebugEntry = { ts: Date.now(), tag, message };
      if (__DEV__) {
        console.log(`[PlaybackDebug:${tag}]`, message);
      }
      set((s) => ({
        entries: [...s.entries.slice(-(MAX_ENTRIES - 1)), entry],
      }));
    },

    setIframeReady: (ready) => set({ iframeReady: ready }),
    setYoutubeId: (id) => set({ youtubeId: id }),
    setStoreIsPlaying: (playing) => set({ storeIsPlaying: playing }),
    setIframeState: (state) => set({ iframeState: state }),

    noteSkip: (reason) => {
      get().log('skip', reason);
      set({ lastSkipReason: reason });
    },

    noteError: (message) => {
      get().log('error', message);
      set({ lastError: message });
    },

    incrementMount: () => {
      const count = get().mountCount + 1;
      get().log('mount', `iframe mount #${count}`);
      set({ mountCount: count });
    },

    reset: () =>
      set({
        entries: [],
        iframeReady: false,
        youtubeId: null,
        storeIsPlaying: false,
        iframeState: 'unstarted',
        lastSkipReason: null,
        lastError: null,
        mountCount: 0,
      }),
  })
);
