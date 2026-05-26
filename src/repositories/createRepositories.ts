import { ClaudeRecommendationRepository } from './claudeRecommendationRepository';
import { MockRecommendationRepository } from './mockRecommendationRepository';
import { MockTracksRepository, SupabaseTracksRepository } from './tracksRepository';
import { createYoutubeRepository } from './youtubeRepository';
import type {
  RecommendationRepository,
  TracksRepository,
  YoutubeRepository,
} from './types';

export type AppRepositories = {
  recommendation: RecommendationRepository;
  tracks: TracksRepository;
  youtube: YoutubeRepository;
};

function recommendationBackend(): 'mock' | 'supabase' {
  const raw =
    process.env.EXPO_PUBLIC_RECOMMENDATION_SOURCE ??
    process.env.EXPO_PUBLIC_RECOMMENDATION_BACKEND ??
    'mock';
  return raw === 'supabase' ? 'supabase' : 'mock';
}

function createTracksRepository(): TracksRepository {
  return process.env.EXPO_PUBLIC_SUPABASE_URL &&
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    ? new SupabaseTracksRepository()
    : new MockTracksRepository();
}

export function createRepositories(): AppRepositories {
  const tracks = createTracksRepository();
  const youtube = createYoutubeRepository();

  const recommendation =
    recommendationBackend() === 'supabase'
      ? new ClaudeRecommendationRepository({ tracks, youtube })
      : new MockRecommendationRepository();

  return { recommendation, tracks, youtube };
}

let cached: AppRepositories | null = null;

export function getRepositories(): AppRepositories {
  if (!cached) cached = createRepositories();
  return cached;
}

export function resetRepositoriesForTests() {
  cached = null;
}
