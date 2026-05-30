import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import {
  getGoogleAuthStartUrl,
  getGoogleProxyRedirectUri,
  getGoogleReturnUrl,
} from '@/constants/googleOAuth';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

const SCOPES = [
  'openid',
  'profile',
  'email',
  'https://www.googleapis.com/auth/youtube',
];

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export type GoogleUser = {
  name: string;
  email: string;
  picture: string;
};

export type AuthState = {
  accessToken: string;
  expiresAt: number;
  user: GoogleUser;
};

let currentAuth: AuthState | null = null;

export function isGoogleAuthConfigured(): boolean {
  return !!GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'your_google_client_id';
}

export function getCachedAuth(): AuthState | null {
  if (currentAuth && Date.now() < currentAuth.expiresAt) return currentAuth;
  currentAuth = null;
  return null;
}

export function getCachedAccessToken(): string | null {
  return getCachedAuth()?.accessToken ?? null;
}

export function clearAuth() {
  currentAuth = null;
}

async function fetchUserProfile(accessToken: string): Promise<GoogleUser> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to fetch user profile');
  const data = await res.json();
  return {
    name: data.name ?? '',
    email: data.email ?? '',
    picture: data.picture ?? '',
  };
}

/**
 * Google OAuth 로그인 (Expo Go: auth.expo.io 프록시 + exp:// return).
 * 실패 시 null (앱 크래시 없음).
 */
export async function signInWithGoogle(): Promise<AuthState | null> {
  if (!isGoogleAuthConfigured()) {
    console.warn('[googleAuth] EXPO_PUBLIC_GOOGLE_CLIENT_ID not configured');
    return null;
  }

  const cached = getCachedAuth();
  if (cached) return cached;

  try {
    const redirectUri = getGoogleProxyRedirectUri();
    const returnUrl = getGoogleReturnUrl();

    const request = new AuthSession.AuthRequest({
      clientId: GOOGLE_CLIENT_ID,
      scopes: SCOPES,
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
      usePKCE: false,
    });

    const authUrl = await request.makeAuthUrlAsync(discovery);
    const startUrl = getGoogleAuthStartUrl(authUrl, returnUrl);

    const browserResult = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl);

    if (browserResult.type !== 'success') {
      console.log('[googleAuth] browser result:', browserResult.type);
      return null;
    }

    const result = request.parseReturnUrl(browserResult.url);

    if (result.type === 'success' && result.authentication?.accessToken) {
      const accessToken = result.authentication.accessToken;
      const expiresIn = result.authentication.expiresIn ?? 3600;
      const expiresAt = Date.now() + expiresIn * 1000 - 60_000;

      const user = await fetchUserProfile(accessToken);
      currentAuth = { accessToken, expiresAt, user };
      console.log('[googleAuth] signed in as:', user.email);
      return currentAuth;
    }

    if (result.type === 'error') {
      console.log('[googleAuth] auth error:', result.error);
    } else {
      console.log('[googleAuth] auth result type:', result.type);
    }
    return null;
  } catch (err) {
    console.error('[googleAuth] sign-in error:', err);
    return null;
  }
}
