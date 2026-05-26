import { create } from 'zustand';

type ToastMessage = {
  id: string;
  text: string;
  durationMs: number;
};

type ToastStore = {
  current: ToastMessage | null;
  show: (text: string, durationMs?: number) => void;
  dismiss: () => void;
};

let timer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastStore>((set, get) => ({
  current: null,

  show: (text, durationMs = 2800) => {
    if (timer) clearTimeout(timer);
    const id = `toast_${Date.now()}`;
    set({ current: { id, text, durationMs } });
    timer = setTimeout(() => {
      if (get().current?.id === id) {
        set({ current: null });
      }
      timer = null;
    }, durationMs);
  },

  dismiss: () => {
    if (timer) clearTimeout(timer);
    timer = null;
    set({ current: null });
  },
}));
