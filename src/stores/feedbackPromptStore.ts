import { create } from 'zustand';

import type { EmotionId } from '@/types/emotion';

export type FeedbackPromptTrigger = 'playlist_completed' | 'tracks_played';

type PendingFeedbackPrompt = {
  playlistSessionId: string;
  emotionId?: EmotionId;
  trigger: FeedbackPromptTrigger;
  requestedAt: number;
};

type FeedbackPromptStore = {
  pending: PendingFeedbackPrompt | null;
  dismissedSessionIds: string[];

  requestPrompt: (input: Omit<PendingFeedbackPrompt, 'requestedAt'>) => void;
  dismiss: () => void;
  clear: () => void;
  wasDismissed: (sessionId: string) => boolean;
};

const MAX_DISMISSED = 40;

export const useFeedbackPromptStore = create<FeedbackPromptStore>((set, get) => ({
  pending: null,
  dismissedSessionIds: [],

  requestPrompt: (input) => {
    if (get().wasDismissed(input.playlistSessionId)) return;
    set({
      pending: { ...input, requestedAt: Date.now() },
    });
  },

  dismiss: () => {
    const pending = get().pending;
    if (pending) {
      const dismissed = [
        pending.playlistSessionId,
        ...get().dismissedSessionIds,
      ].slice(0, MAX_DISMISSED);
      set({ pending: null, dismissedSessionIds: dismissed });
    } else {
      set({ pending: null });
    }
  },

  clear: () => set({ pending: null, dismissedSessionIds: [] }),

  wasDismissed: (sessionId) => get().dismissedSessionIds.includes(sessionId),
}));
