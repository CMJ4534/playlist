import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  isRecommendApiResponse,
  type RecommendApiRequest,
  type RecommendApiResponse,
} from '@/types/recommendApi';
import { RecommendationError } from '@/services/recommendationFallback';

const DEFAULT_TIMEOUT_MS = 28_000;

export type InvokeRecommendOptions = {
  timeoutMs?: number;
};

/**
 * Supabase Edge Function `recommend` 호출.
 */
export async function invokeRecommendEdge(
  body: RecommendApiRequest,
  options?: InvokeRecommendOptions
): Promise<RecommendApiResponse> {
  if (!isSupabaseConfigured) {
    throw new RecommendationError(
      'Supabase가 설정되지 않았습니다.',
      'not_configured'
    );
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const invokePromise = supabase.functions.invoke('recommend', { body });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new RecommendationError('추천 요청 시간이 초과되었습니다.', 'timeout')),
      timeoutMs
    );
  });

  let data: unknown;
  let error: { message?: string } | null;

  try {
    const result = await Promise.race([invokePromise, timeoutPromise]);
    data = result.data;
    error = result.error;
  } catch (err) {
    if (err instanceof RecommendationError) throw err;
    throw new RecommendationError('추천 서버에 연결할 수 없습니다.', 'network', err);
  }

  if (error) {
    throw new RecommendationError(
      error.message ?? 'Edge Function 오류',
      'edge_error',
      error
    );
  }

  const payload = unwrapPayload(data);

  if (!isRecommendApiResponse(payload)) {
    throw new RecommendationError('추천 응답 형식이 올바르지 않습니다.', 'malformed', payload);
  }

  if (!payload.tracks?.length) {
    throw new RecommendationError('추천 곡 목록이 비어 있습니다.', 'empty_tracks');
  }

  return payload;
}

/** functions.invoke가 문자열·중첩 data를 반환하는 경우 정규화 */
function unwrapPayload(data: unknown): unknown {
  if (data == null) return data;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }
  if (typeof data === 'object' && 'playlistName' in (data as object)) {
    return data;
  }
  if (typeof data === 'object' && 'data' in (data as object)) {
    return unwrapPayload((data as { data: unknown }).data);
  }
  return data;
}
