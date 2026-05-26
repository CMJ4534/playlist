/**
 * Sentry 연동 준비 — @sentry/react-native 설치 전 no-op.
 *
 * 연동 시:
 *   npx expo install @sentry/react-native
 *   EXPO_PUBLIC_SENTRY_DSN 설정 후 initSentry() 구현
 */

export type CaptureContext = {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  level?: 'error' | 'warning' | 'info';
};

let enabled = false;

export function initSentry(): void {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  enabled = Boolean(dsn);
  if (!enabled && typeof __DEV__ !== 'undefined' && __DEV__) {
    console.info('[sentry] DSN not set — capture disabled');
  }
  // TODO: Sentry.init({ dsn, enableInExpoDevelopment: false })
}

export function isSentryEnabled(): boolean {
  return enabled;
}

export function captureException(
  error: unknown,
  context?: CaptureContext
): void {
  if (enabled) {
    // TODO: Sentry.captureException(error, { extra: context?.extra, tags: context?.tags })
    return;
  }

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.error('[sentry:capture]', error, context);
  }
}

export function captureMessage(
  message: string,
  context?: CaptureContext
): void {
  if (enabled) {
    // TODO: Sentry.captureMessage(message, context?.level ?? 'info')
    return;
  }

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn('[sentry:message]', message, context);
  }
}
