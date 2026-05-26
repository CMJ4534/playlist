/**
 * Edge /recommend 에러 로깅 — 추후 Sentry/Datadog webhook 연결 지점.
 */

export type EdgeErrorContext = {
  stage: 'parse' | 'pipeline' | 'claude' | 'resolve' | 'fallback';
  emotion?: string;
  durationMs?: number;
  message: string;
  stack?: string;
};

export function logEdgeError(context: EdgeErrorContext, err?: unknown): void {
  const payload = {
    service: 'recommend',
    ...context,
    error:
      err instanceof Error ?
        { name: err.name, message: err.message, stack: err.stack }
      : err,
    at: new Date().toISOString(),
  };

  console.error('[recommend:error]', JSON.stringify(payload));

  // TODO: Deno.env.get('SENTRY_DSN_EDGE') → fetch Sentry store API
  // TODO: Supabase insert into ops.edge_error_logs
}

export function logEdgeMetric(
  name: string,
  fields: Record<string, string | number | boolean>
): void {
  console.info('[recommend:metric]', JSON.stringify({ name, ...fields, at: new Date().toISOString() }));
}
