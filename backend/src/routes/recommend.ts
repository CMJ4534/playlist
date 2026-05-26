import { Router, type Request, type Response } from 'express';

import {
  isValidEmotion,
  getEmotionProfile,
  getMoodTag,
  type EmotionId,
} from '../services/emotionKeywords.js';
import { getCuratedPlaylist } from '../services/curatedCatalog.js';

const TARGET_PLAYLIST_SIZE = 10;

const router = Router();

/**
 * POST /api/recommend
 *
 * 감정 기반 플레이리스트 추천.
 * 추천은 내부 큐레이션 카탈로그에서 생성.
 * YouTube는 재생 도구일 뿐, 검색에 의존하지 않음.
 *
 * Body: { emotion: EmotionId, diary?: string }
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { emotion, diary, situation } = req.body;
    const diaryText = diary ?? situation ?? null;

    if (!emotion || !isValidEmotion(emotion)) {
      res.status(400).json({
        error: 'Invalid emotion. Must be one of: sad, dawn, focus, rain, walk, blank',
      });
      return;
    }

    const emotionId = emotion as EmotionId;
    const profile = getEmotionProfile(emotionId);
    const moodTag = getMoodTag(emotionId);

    // 내부 카탈로그에서 큐레이션 — YouTube 검색 없음
    const tracks = getCuratedPlaylist(emotionId, TARGET_PLAYLIST_SIZE);

    console.log(`[recommend] emotion=${emotionId}, catalog=${tracks.length}곡`);

    const videos = tracks.map((t) => ({
      videoId: t.videoId,
      title: t.title,
      artist: t.artist,
      channelTitle: t.artist,
      thumbnailUrl: t.thumbnailUrl,
      youtubeUrl: `https://www.youtube.com/watch?v=${t.videoId}`,
      mood: t.mood,
      moodTag: t.mood,
    }));

    res.json({
      emotion: emotionId,
      emotionLabel: profile?.label ?? emotionId,
      emotionEmoji: profile?.emoji ?? '🎵',
      moodTag,
      diary: diaryText,
      playback: {
        tier: 'videoIds',
        videos,
        totalCount: videos.length,
      },
      meta: {
        videoCount: videos.length,
        source: 'curated_catalog',
        timestamp: Date.now(),
      },
    });
  } catch (err) {
    console.error('[recommend] unexpected error:', err);

    res.status(500).json({
      error: 'Internal server error',
      playback: { tier: 'videoIds', videos: [], totalCount: 0 },
      meta: { videoCount: 0, source: 'error', timestamp: Date.now() },
    });
  }
});

router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

export default router;
