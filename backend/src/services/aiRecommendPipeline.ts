import type { RecommendApiResponse, RecommendRequestBody } from '../types/recommend.js';
import {
  getEmotionProfile,
  getMoodTag,
  isValidEmotion,
  type EmotionId,
} from './emotionKeywords.js';
import { fetchGeminiPlaylist } from './geminiSongClient.js';
import { delay, searchYoutubeVideo } from './youtubeSearch.js';

const MIN_RESOLVED_VIDEOS = 3;
const YOUTUBE_SEARCH_DELAY_MS = 250;

/**
 * Gemini 10곡 → YouTube 검색 → 앱 RecommendResponse 형식
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

  const gemini = await fetchGeminiPlaylist({
    emotionId,
    diary,
    tastePreferences: body.tastePreferences,
  });

  const youtubeKey = process.env.YOUTUBE_API_KEY?.trim();
  if (!youtubeKey) {
    throw new Error('YOUTUBE_API_KEY not configured');
  }

  const videos: RecommendApiResponse['playback']['videos'] = [];

  for (const song of gemini.songs.slice(0, 10)) {
    const hit = await searchYoutubeVideo(
      youtubeKey,
      song.title.trim(),
      song.artist.trim()
    );
    if (hit) {
      videos.push({
        videoId: hit.videoId,
        title: song.title.trim(),
        artist: song.artist.trim(),
        channelTitle: hit.channelTitle,
        thumbnailUrl: hit.thumbnailUrl,
        youtubeUrl: `https://www.youtube.com/watch?v=${hit.videoId}`,
        mood: moodTag,
        moodTag,
      });
    }
    await delay(YOUTUBE_SEARCH_DELAY_MS);
  }

  if (videos.length < MIN_RESOLVED_VIDEOS) {
    throw new Error(
      `Only ${videos.length} videos resolved from YouTube (min ${MIN_RESOLVED_VIDEOS})`
    );
  }

  console.log(
    `[aiRecommend] emotion=${emotionId} gemini=${gemini.songs.length} resolved=${videos.length}`
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
      playlistName: gemini.playlistName,
      playlistComment: gemini.playlistComment,
    },
  };
}

export function isAiPipelineConfigured(): boolean {
  return Boolean(
    process.env.GEMINI_API_KEY?.trim() && process.env.YOUTUBE_API_KEY?.trim()
  );
}
