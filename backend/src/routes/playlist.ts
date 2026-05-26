import { Router, type Request, type Response } from 'express';
import { createPlaylist } from '../services/youtube.js';

const router = Router();

/**
 * POST /api/playlist
 *
 * Body: {
 *   accessToken: string       — Google OAuth access token (YouTube scope)
 *   videoIds: string[]         — 추가할 videoId 리스트
 *   title?: string             — 플레이리스트 제목
 *   description?: string       — 설명
 * }
 *
 * Response: {
 *   success: boolean
 *   playlistId?: string
 *   playlistUrl?: string
 *   videoCount: number
 *   error?: string
 * }
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { accessToken, videoIds, title, description } = req.body;

    if (!accessToken || typeof accessToken !== 'string') {
      res.status(400).json({
        success: false,
        error: 'accessToken is required',
        videoCount: 0,
      });
      return;
    }

    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      res.status(400).json({
        success: false,
        error: 'videoIds must be a non-empty array',
        videoCount: 0,
      });
      return;
    }

    const validVideoIds = videoIds.filter(
      (id: unknown) => typeof id === 'string' && id.trim().length > 0
    );

    if (validVideoIds.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No valid videoIds provided',
        videoCount: 0,
      });
      return;
    }

    const playlistTitle = title ?? '🎵 MoodPlay 플레이리스트';
    const playlistDesc = description ?? 'MoodPlay에서 생성된 감정 큐레이션 플레이리스트';

    console.log(`[playlist] Creating playlist: "${playlistTitle}" with ${validVideoIds.length} videos`);

    const result = await createPlaylist(
      playlistTitle,
      playlistDesc,
      validVideoIds,
      accessToken
    );

    if (!result) {
      res.status(502).json({
        success: false,
        error: 'YouTube API playlist creation failed. Check your access token.',
        videoCount: validVideoIds.length,
      });
      return;
    }

    console.log(`[playlist] Created: ${result.playlistUrl}`);

    res.json({
      success: true,
      playlistId: result.playlistId,
      playlistUrl: result.playlistUrl,
      videoCount: validVideoIds.length,
    });
  } catch (err) {
    console.error('[playlist] unexpected error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      videoCount: 0,
    });
  }
});

export default router;
