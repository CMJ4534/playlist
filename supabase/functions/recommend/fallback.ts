import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import { buildRecommendationPlan } from './recommendationBuilder.ts';
import { createServiceClient, resolveTracks } from './trackResolver.ts';
import type { RecommendRequest, RecommendResponse } from './types.ts';

const EMOTION_MOOD: Record<string, string[]> = {
  sad: ['우울', '잔잔한', '몽환적'],
  dawn: ['새벽', '몽환적', '잔잔한'],
  focus: ['집중', '몽환적'],
  rain: ['비', '잔잔한', '감성'],
  walk: ['산책', '감성', '잔잔한'],
  blank: ['멍', '잔잔한', '배경'],
};

const ENERGY_BY_EMOTION: Record<string, [number, number]> = {
  sad: [2, 5],
  dawn: [2, 5],
  focus: [5, 8],
  rain: [2, 5],
  walk: [3, 6],
  blank: [1, 4],
};

/**
 * pipeline 실패 시에도 tracks DB 기반 diverse 큐레이션.
 */
export async function buildFallbackResponse(
  request: RecommendRequest,
  supabase?: SupabaseClient | null
): Promise<RecommendResponse> {
  const emotion = request.emotion || 'blank';
  const situation = request.situation?.trim();
  const moodTags = EMOTION_MOOD[emotion] ?? ['감성'];
  const [energyMin, energyMax] = ENERGY_BY_EMOTION[emotion] ?? [2, 6];

  const comment = situation
    ? `“${situation}” — 잠시 쉬어 가도 괜찮아요.`
    : '지금 이 순간에 어울리는 음악을 골랐어요.';

  const titles: Record<string, string> = {
    sad: '조용히 스며드는 밤 (안정)',
    dawn: '새벽 감성 (안정)',
    focus: '집중 모드 (안정)',
    rain: '비 오는 날 (안정)',
    walk: '혼자 걷기 (안정)',
    blank: '멍 때리기 (안정)',
  };

  const client = supabase ?? createServiceClient();
  const plan = buildRecommendationPlan(
    {
      playlistName: titles[emotion] ?? '오늘의 무드',
      playlistComment: comment,
      moodTags,
      energyMin,
      energyMax,
      limit: 12,
      excludeYoutubeIds: request.excludeYoutubeIds,
      maxPerArtist: 2,
    },
    request
  );

  if (client) {
    const tracks = await resolveTracks(client, plan);
    if (tracks.length >= 3) {
      return {
        playlistName: plan.playlistName,
        playlistComment: plan.playlistComment,
        tracks,
        meta: { source: 'fallback', resolvedCount: tracks.length },
      };
    }
  }

  return hardcodedFallback(emotion, comment);
}

function hardcodedFallback(emotion: string, comment: string): RecommendResponse {
  const tracks = [
    {
      id: 'fallback-1',
      youtubeId: 'Km71Rr9K-Bw',
      title: 'Ditto',
      artist: 'NewJeans',
      thumbnailUrl: 'https://img.youtube.com/vi/Km71Rr9K-Bw/hqdefault.jpg',
      moodTags: ['몽환적', '잔잔한'],
      energyLevel: 4,
      noveltyTier: 'familiar' as const,
    },
    {
      id: 'fallback-2',
      youtubeId: 'ArmDp-zijig',
      title: 'Super Shy',
      artist: 'NewJeans',
      thumbnailUrl: 'https://img.youtube.com/vi/ArmDp-zijig/hqdefault.jpg',
      moodTags: ['밝은'],
      energyLevel: 6,
      noveltyTier: 'familiar' as const,
    },
    {
      id: 'fallback-3',
      youtubeId: '11t7c7UJfNM',
      title: 'Hype Boy',
      artist: 'NewJeans',
      thumbnailUrl: 'https://img.youtube.com/vi/11t7c7UJfNM/hqdefault.jpg',
      moodTags: ['경쾌한'],
      energyLevel: 7,
      noveltyTier: 'mid' as const,
    },
  ];

  return {
    playlistName: `기본 플레이리스트 (${emotion})`,
    playlistComment: comment,
    tracks,
    meta: { source: 'fallback', resolvedCount: tracks.length },
  };
}
