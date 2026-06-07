import { Router, type Request, type Response } from 'express';

import { runAiRecommendPipeline, isAiPipelineConfigured } from '../services/aiRecommendPipeline.js';
import { buildCuratedRecommendResponse } from '../services/curatedRecommendFallback.js';
import { isValidEmotion, type EmotionId } from '../services/emotionKeywords.js';
import type { RecommendRequestBody } from '../types/recommend.js';

const router = Router();

/**
 * POST /api/recommend
 *
 * Body: { emotion, diary?, tastePreferences? }
 * AI: Gemini 2.5 Flash → YouTube search → RecommendResponse
 * Fallback: 내부 큐레이션 카탈로그
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const body = req.body as RecommendRequestBody;
  const { emotion, diary, situation } = body;
  const diaryText = diary ?? situation ?? null;

  if (!emotion || !isValidEmotion(emotion)) {
    res.status(400).json({
      error: 'Invalid emotion. Must be one of: sad, dawn, focus, rain, walk, blank',
    });
    return;
  }

  const emotionId = emotion as EmotionId;

  if (body.strategyContext?.sessionId) {
    console.log(
      `[recommend] session_id=${body.strategyContext.sessionId} strategy=${body.strategyContext.strategyId ?? 'n/a'}`
    );
  }

  try {
    if (isAiPipelineConfigured()) {
      const response = await runAiRecommendPipeline(body);
      res.json(response);
      return;
    }

    console.warn('[recommend] AI keys missing — using curated catalog');
    res.json(
      buildCuratedRecommendResponse(emotionId, diaryText, 'curated_catalog', body.strategyContext)
    );
  } catch (err) {
    console.error('[recommend] AI pipeline failed, fallback:', err);
    res.json(
      buildCuratedRecommendResponse(
        emotionId,
        diaryText,
        'curated_catalog_fallback',
        body.strategyContext
      )
    );
  }
});

router.get('/health', (_req: Request, res: Response) => {
  const youtube = process.env.YOUTUBE_API_KEY?.trim();
  const gemini = process.env.GEMINI_API_KEY?.trim();
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    aiConfigured: isAiPipelineConfigured(),
    env: {
      geminiKeyLoaded: Boolean(gemini),
      youtubeKeyLoaded: Boolean(youtube),
    },
  });
});

export default router;
