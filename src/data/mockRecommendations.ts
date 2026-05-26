import { getEmotionCurationProfile } from '@/constants/emotionCuration';
import { ALL_SEED_TRACKS, SEED_TRACKS_BY_CATEGORY } from '@/data/seeds';
import type { SeedCategory } from '@/data/seeds/types';
import { buildCuratedPlaylistResult } from '@/lib/curatedPlaylist';
import { filterPlayableTracks } from '@/lib/embedSafeFilter';
import type { EmotionId } from '@/types/emotion';
import type { PlaylistRecommendation } from '@/types/recommendation';
import type { UserTasteProfile } from '@/types/recommendApi';

const PLAYLIST_META: Record<
  EmotionId,
  { title: string; descriptionTemplate: string }
> = {
  sad: {
    title: '조용히 스며드는 밤',
    descriptionTemplate:
      '처음은 잔잔하게, 마음이 조금 움직였다가 다시 가라앉는 흐름. {situation}',
  },
  dawn: {
    title: '새벽 3시의 창가',
    descriptionTemplate:
      '어둠에서 빛으로 천천히 넘어가는 선율. {situation}',
  },
  focus: {
    title: '깊은 집중의 리듬',
    descriptionTemplate: '점점 몰입이 깊어지는 리듬. {situation}',
  },
  rain: {
    title: '빗소리와 함께',
    descriptionTemplate: '비처럼 스며들었다가 잔잔히 마무리되는 곡들. {situation}',
  },
  walk: {
    title: '혼자 걷는 거리',
    descriptionTemplate:
      '발걸음에 맞춰 조금씩 밝아졌다가, 다시 편안하게 끝나는 길. {situation}',
  },
  blank: {
    title: '아무 생각 없이',
    descriptionTemplate: '멍해도 괜찮은 흐름. {situation}',
  },
};

function emotionToSeedCategory(emotionId: EmotionId): SeedCategory {
  if (emotionId === 'walk') return 'walking';
  return emotionId as SeedCategory;
}

export function buildMockRecommendation(
  emotionId: EmotionId,
  situation: string,
  excludeYoutubeIds?: string[],
  userTasteProfile?: UserTasteProfile | null
): PlaylistRecommendation {
  const meta = PLAYLIST_META[emotionId];
  const profile = getEmotionCurationProfile(emotionId);
  const situationLine = situation.trim()
    ? `지금 당신의 순간 — "${situation.trim()}"`
    : '지금 이 순간에 어울리는 음악을 골랐어요.';

  const category = emotionToSeedCategory(emotionId);
  const pool = SEED_TRACKS_BY_CATEGORY[category]?.length
    ? SEED_TRACKS_BY_CATEGORY[category]
    : ALL_SEED_TRACKS;

  const { tracks, generationMeta } = buildCuratedPlaylistResult(pool, emotionId, {
    excludeYoutubeIds,
    limit: profile.limit,
    userTasteProfile,
  });

  const finalTracks = tracks.length ? tracks : filterPlayableTracks(pool).slice(0, 10);

  return {
    title: meta.title,
    description: meta.descriptionTemplate.replace('{situation}', situationLine),
    tracks: finalTracks,
    generationMeta: {
      ...generationMeta,
      trackCount: finalTracks.length,
    },
  };
}
