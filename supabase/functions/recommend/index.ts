import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

import { getClaudeRecommendationPlan } from './claudeClient.ts';
import { logEdgeError, logEdgeMetric } from './errorLogger.ts';
import { buildFallbackResponse } from './fallback.ts';
import { buildRecommendationPlan } from './recommendationBuilder.ts';
import { createServiceClient, resolveTracks } from './trackResolver.ts';
import type { RecommendRequest, RecommendResponse } from './types.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  let body: RecommendRequest;
  try {
    body = await req.json();
  } catch {
    logEdgeError({ stage: 'parse', message: 'Invalid JSON body' });
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body?.emotion || typeof body.emotion !== 'string') {
    return json({ error: 'emotion is required' }, 400);
  }

  const started = Date.now();
  const timeoutMs = Number(Deno.env.get('RECOMMEND_TIMEOUT_MS') ?? '28000');

  try {
    const response = await Promise.race([
      runPipeline(body),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('RECOMMEND_TIMEOUT')), timeoutMs);
      }),
    ]);

    const durationMs = Date.now() - started;
    logEdgeMetric('recommendation_success', {
      emotion: body.emotion,
      source: response.meta?.source ?? 'unknown',
      trackCount: response.tracks.length,
      durationMs,
    });
    return json(response);
  } catch (err) {
    logEdgeError(
      {
        stage: 'pipeline',
        emotion: body.emotion,
        durationMs: Date.now() - started,
        message: err instanceof Error ? err.message : 'pipeline_error',
        stack: err instanceof Error ? err.stack : undefined,
      },
      err
    );
    const supabase = createServiceClient();
    const fallback = await buildFallbackResponse(body, supabase);
    logEdgeMetric('recommendation_fallback', {
      emotion: body.emotion,
      trackCount: fallback.tracks.length,
    });
    return json(fallback, 200);
  }
});

async function runPipeline(request: RecommendRequest): Promise<RecommendResponse> {
  const claudeRaw = await getClaudeRecommendationPlan(request);
  const plan = buildRecommendationPlan(claudeRaw, request);

  const supabase = createServiceClient();
  const tracks = await resolveTracks(supabase, plan);

  if (tracks.length < 3) {
    throw new Error(`Insufficient tracks resolved: ${tracks.length}`);
  }

  const source = Deno.env.get('CLAUDE_API_KEY') ? 'claude' : 'mock';

  return {
    playlistName: plan.playlistName,
    playlistComment: plan.playlistComment,
    tracks,
    meta: {
      source,
      resolvedCount: tracks.length,
    },
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
