import { isDevEnvironment } from '@/constants/dev';

/** Beta QA / Dev 화면 노출 (production 기본 off) */
export function isBetaQaEnabled(): boolean {
  if (isDevEnvironment()) return true;

  const env = process.env.EXPO_PUBLIC_APP_ENV ?? process.env.APP_ENV ?? 'development';
  if (env !== 'production') return true;

  return process.env.EXPO_PUBLIC_BETA_QA === '1';
}
