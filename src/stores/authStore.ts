import { create } from 'zustand';

import {
  signInWithGoogle,
  clearAuth,
  getCachedAuth,
  type AuthState,
  type GoogleUser,
} from '@/services/googleAuth';

type AuthStoreState = {
  isSignedIn: boolean;
  user: GoogleUser | null;
  accessToken: string | null;
  loading: boolean;

  signIn: () => Promise<boolean>;
  signOut: () => void;
  getValidToken: () => string | null;
};

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  isSignedIn: false,
  user: null,
  accessToken: null,
  loading: false,

  signIn: async () => {
    set({ loading: true });
    try {
      const auth = await signInWithGoogle();
      if (auth) {
        set({
          isSignedIn: true,
          user: auth.user,
          accessToken: auth.accessToken,
          loading: false,
        });
        return true;
      }
      set({ loading: false });
      return false;
    } catch {
      set({ loading: false });
      return false;
    }
  },

  signOut: () => {
    clearAuth();
    set({
      isSignedIn: false,
      user: null,
      accessToken: null,
    });
  },

  getValidToken: () => {
    const cached = getCachedAuth();
    if (cached) return cached.accessToken;
    set({ isSignedIn: false, user: null, accessToken: null });
    return null;
  },
}));
