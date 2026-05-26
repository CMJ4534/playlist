import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';

const YOUTUBE_SCOPE = 'https://www.googleapis.com/auth/youtube';

const discovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

export function getCachedAccessToken(): string | null {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  return null;
}

export function clearCachedToken() {
  cachedToken = null;
  tokenExpiresAt = 0;
}

export function isGoogleAuthConfigured(): boolean {
  return !!GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'your_google_client_id';
}

/**
 * Google OAuth 로그인 → YouTube scope로 access token 획득.
 * 실패 시 null 반환 (앱 크래시 없음).
 */
export async function signInWithGoogle(): Promise<string | null> {
  if (!isGoogleAuthConfigured()) {
    console.warn('[googleAuth] EXPO_PUBLIC_GOOGLE_CLIENT_ID is not configured');
    return null;
  }

  const cached = getCachedAccessToken();
  if (cached) return cached;

  try {
    const redirectUri = AuthSession.makeRedirectUri({ scheme: 'moodplay' });

    const request = new AuthSession.AuthRequest({
      clientId: GOOGLE_CLIENT_ID,
      scopes: [YOUTUBE_SCOPE, 'openid', 'profile'],
      redirectUri,
      responseType: AuthSession.ResponseType.Token,
      usePKCE: false,
    });

    const result = await request.promptAsync(discovery);

    if (result.type === 'success' && result.authentication?.accessToken) {
      cachedToken = result.authentication.accessToken;
      const expiresIn = result.authentication.expiresIn ?? 3600;
      tokenExpiresAt = Date.now() + expiresIn * 1000 - 60000;
      return cachedToken;
    }

    return null;
  } catch (err) {
    console.error('[googleAuth] sign-in error:', err);
    return null;
  }
}
