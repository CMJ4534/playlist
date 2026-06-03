import Constants from 'expo-constants';
import { Platform } from 'react-native';

type ExpoExtra = {
  backendUrl?: string;
};

const LOCALHOST_FALLBACK = 'http://localhost:3001';

function readExtraBackendUrl(): string | undefined {
  const extra = Constants.expoConfig?.extra as ExpoExtra | undefined;
  return extra?.backendUrl?.trim() || undefined;
}

/**
 * API 베이스 URL.
 * 1) process.env.EXPO_PUBLIC_BACKEND_URL (Metro 인라인)
 * 2) app.config.ts extra.backendUrl (Expo config 시점 고정)
 * 3) 개발용 localhost (시뮬레이터 전용 — 실기기에서는 실패)
 */
export function resolveApiBase(): string {
  const fromProcess = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  const fromExtra = readExtraBackendUrl();
  const resolved = fromProcess || fromExtra;

  if (resolved) {
    return resolved.replace(/\/$/, '');
  }

  return (
    Platform.select({
      android: LOCALHOST_FALLBACK,
      ios: LOCALHOST_FALLBACK,
      default: LOCALHOST_FALLBACK,
    }) ?? LOCALHOST_FALLBACK
  );
}

/** fetch 직전 진단 로그 */
export function logApiBaseDiagnostics(context: string): void {
  const resolved = resolveApiBase();
  const fromProcess = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
  const fromExtra = readExtraBackendUrl();

  console.log(`[FLOW][API] ${context} — diagnostics`, {
    platform: Platform.OS,
    'process.env.EXPO_PUBLIC_BACKEND_URL': fromProcess ?? '(undefined)',
    'extra.backendUrl': fromExtra ?? '(undefined)',
    resolvedApiBase: resolved,
    usingLocalhostFallback: resolved === LOCALHOST_FALLBACK,
  });

  if (Platform.OS === 'android' && resolved.includes('localhost')) {
    console.warn(
      '[FLOW][API] Android 실기기에서는 localhost가 폰 자신을 가리킵니다. ' +
        '.env.development의 EXPO_PUBLIC_BACKEND_URL을 PC IP(예: http://192.168.0.100:3001)로 설정한 뒤 npx expo start -c 로 재시작하세요.'
    );
  }
}
