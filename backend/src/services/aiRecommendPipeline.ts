import type { RecommendApiResponse, RecommendRequestBody } from '../types/recommend.js';
import { isPlaceholderEnvValue } from '../loadEnv.js';
import { filterCandidates, rankCandidates } from './candidateSelection.js';import { getCuratedPlaylist } from './curatedCatalog.js';
import {
  getEmotionProfile,
  getMoodTag,
  isValidEmotion,
  type EmotionId,
} from './emotionKeywords.js';
import { fetchGeminiCandidates } from './geminiSongClient.js';
import { delay, searchYoutubeVideo } from './youtubeSearch.js';

const TARGET_PLAYLIST_SIZE = 10;
const MIN_RESOLVED_VIDEOS = 3;
const TARGET_RESOLVE_RATE = 0.8;
const YOUTUBE_SEARCH_DELAY_MS = 200;

/**
 * Gemini 20 후보 → filter → rank → YouTube resolve → 최종 10곡
 */
export async function runAiRecommendPipeline(
  body: RecommendRequestBody
): Promise<RecommendApiResponse> {
  if (!isValidEmotion(body.emotion)) {
    throw new Error('Invalid emotion');
  }

  const emotionId = body.emotion as EmotionId;
  const diary = body.diary ?? body.situation ?? null;
  const profile = getEmotionProfile(emotionId);
  const moodTag = getMoodTag(emotionId);

  const geminiInput = {
    emotionId,
    diary,
    tastePreferences: body.tastePreferences,
    strategyContext: body.strategyContext,
  };

  if (body.strategyContext?.sessionId) {
    console.log(
      `[aiRecommend] session_id=${body.strategyContext.sessionId} strategy=${body.strategyContext.strategyId} attempt=${body.strategyContext.attemptCount}`
    );
  }

  const gemini = await fetchGeminiCandidates(geminiInput);

  const filtered = filterCandidates(gemini.candidates);
  const ranked = rankCandidates(filtered, geminiInput);

  console.log(
    `[aiRecommend] pipeline candidates raw=${gemini.candidates.length} filtered=${filtered.length} ranked=${ranked.length}`
  );

  if (filtered.length < MIN_RESOLVED_VIDEOS) {
    throw new Error(
      `Too few candidates after filter (${filtered.length}, min ${MIN_RESOLVED_VIDEOS})`
    );
  }

  const youtubeKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!youtubeKey) {
    throw new Error('YOUTUBE_API_KEY not configured');
  }
  if (isPlaceholderEnvValue(youtubeKey)) {
    throw new Error(
      'YOUTUBE_API_KEY is still a placeholder — set a real YouTube Data API v3 key in backend/.env'
    );
  }

  const videos: RecommendApiResponse['playback']['videos'] = [];
  const usedVideoIds = new Set<string>();
  let youtubeAttempts = 0;

  for (const song of ranked) {
    if (videos.length >= TARGET_PLAYLIST_SIZE) break;

    const title = song.title.trim();
    const artist = song.artist.trim();
    youtubeAttempts += 1;
    const hit = await searchYoutubeVideo(
      youtubeKey,
      title,
      artist,
      body.strategyContext?.discoveryPressure ?? 'mainstream'
    );
    if (hit && !usedVideoIds.has(hit.videoId)) {
      usedVideoIds.add(hit.videoId);
      videos.push({
        videoId: hit.videoId,
        title,
        artist,
        channelTitle: hit.channelTitle,
        thumbnailUrl: hit.thumbnailUrl,
        youtubeUrl: `https://www.youtube.com/watch?v=${hit.videoId}`,
        mood: moodTag,
        moodTag,
      });
    } else if (hit && usedVideoIds.has(hit.videoId)) {
      console.warn(
        `[aiRecommend] duplicate videoId skipped title="${title}" artist="${artist}" videoId=${hit.videoId}`
      );
    }
    await delay(YOUTUBE_SEARCH_DELAY_MS);
  }

  const resolveRate =
    youtubeAttempts > 0 ? videos.length / youtubeAttempts : 0;
  console.log(
    `[aiRecommend] youtube resolve ${videos.length}/${youtubeAttempts} attempts from ${ranked.length} ranked candidates (${(resolveRate * 100).toFixed(0)}%) emotion=${emotionId}`
  );

  if (resolveRate < TARGET_RESOLVE_RATE && videos.length < TARGET_PLAYLIST_SIZE) {
    console.warn(
      `[aiRecommend] resolve rate below target ${(TARGET_RESOLVE_RATE * 100).toFixed(0)}% — check candidates or YouTube quota`
    );
  }

  if (videos.length < MIN_RESOLVED_VIDEOS) {
    throw new Error(
      `Only ${videos.length} videos resolved from YouTube (min ${MIN_RESOLVED_VIDEOS}, attempts ${youtubeAttempts})`
    );
  }

  if (videos.length < TARGET_PLAYLIST_SIZE) {
    const beforePad = videos.length;
    const curated = getCuratedPlaylist(emotionId, TARGET_PLAYLIST_SIZE);
    for (const t of curated) {
      if (videos.length >= TARGET_PLAYLIST_SIZE) break;
      if (usedVideoIds.has(t.videoId)) continue;
      usedVideoIds.add(t.videoId);
      videos.push({
        videoId: t.videoId,
        title: t.title,
        artist: t.artist,
        channelTitle: t.artist,
        thumbnailUrl: t.thumbnailUrl,
        youtubeUrl: `https://www.youtube.com/watch?v=${t.videoId}`,
        mood: t.mood,
        moodTag: t.mood,
      });
    }
    console.warn(
      `[aiRecommend] padded ${videos.length - beforePad} tracks from curated catalog (gemini_youtube kept)`
    );
  }

  const playlistName =
    profile?.label != null
      ? `${profile.emoji} ${profile.label} Playlist`
      : 'Mood Playlist';

  console.log(
    `[aiRecommend] final playlist emotion=${emotionId} candidates=${gemini.candidates.length} videos=${videos.length} source=gemini_youtube`
  );

  return {
    emotion: emotionId,
    emotionLabel: profile?.label ?? emotionId,
    emotionEmoji: profile?.emoji ?? '🎵',
    moodTag,
    diary,
    playback: {
      tier: 'videoIds',
      videos,
      totalCount: videos.length,
    },
    meta: {
      videoCount: videos.length,
      source: 'gemini_youtube',
      timestamp: Date.now(),
      playlistName,
      playlistComment: '',
    },
  };
}

export function isAiPipelineConfigured(): boolean {
  const gemini = process.env.GEMINI_API_KEY?.trim();
  const youtube = process.env.YOUTUBE_API_KEY?.trim();
  return Boolean(
    gemini &&
      youtube &&
      !isPlaceholderEnvValue(gemini) &&
      !isPlaceholderEnvValue(youtube)
  );
}