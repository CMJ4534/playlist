import * as AuthSession from 'expo-auth-session';

/** app.config.ts owner + slug 와 동일 */
export const EXPO_OWNER = 'cmj4534';
export const EXPO_SLUG = 'moodplay';
export const EXPO_PROJECT_FULL_NAME = `@${EXPO_OWNER}/${EXPO_SLUG}`;

/** Google Cloud Console Authorized redirect URIs */
export const GOOGLE_PROXY_REDIRECT_URI = `https://auth.expo.io/${EXPO_PROJECT_FULL_NAME}`;

/** OAuth 요청에 쓰는 redirect_uri (Google → auth.expo.io) */
export function getGoogleProxyRedirectUri(): string {
  console.log('[googleOAuth] redirectUri (Google OAuth):', GOOGLE_PROXY_REDIRECT_URI);
  return GOOGLE_PROXY_REDIRECT_URI;
}

/** 프록시가 최종적으로 돌려보낼 앱 deep link (Expo Go: exp://...) */
export function getGoogleReturnUrl(): string {
  const returnUrl = AuthSession.makeRedirectUri({ scheme: EXPO_SLUG });
  console.log('[googleOAuth] returnUrl (app deep link):', returnUrl);
  return returnUrl;
}

/**
 * auth.expo.io 프록시 시작 URL.
 * Google OAuth URL + 앱 return URL 을 프록시에 전달해야 "finish signing in" 오류가 나지 않음.
 */
export function getGoogleAuthStartUrl(authUrl: string, returnUrl: string): string {
  const params = new URLSearchParams({ authUrl, returnUrl });
  const startUrl = `${GOOGLE_PROXY_REDIRECT_URI}/start?${params.toString()}`;
  console.log('[googleOAuth] startUrl:', startUrl);
  return startUrl;
}
