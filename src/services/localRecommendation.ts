import type { RecommendResponse, VideoItem } from './moodplayApi';

type CuratedTrack = {
  videoId: string;
  title: string;
  artist: string;
  mood: string;
};

const CATALOG: Record<string, CuratedTrack[]> = {
  sad: [
    { videoId: 'BzYnNdCpFzk', title: '밤편지', artist: 'IU', mood: '감성' },
    { videoId: 'xEeFrLSkMm8', title: '이 밤 그날이 되어', artist: '성시경', mood: '감성' },
    { videoId: 'Z3iJiMYiu6Q', title: '사랑했지만', artist: '김광석', mood: '이별' },
    { videoId: 'VPdMfedLq-M', title: '꿈에', artist: '조용필', mood: '감성' },
    { videoId: 'nPt8bK2gbaU', title: 'Let Her Go', artist: 'Passenger', mood: '이별' },
    { videoId: 'hLQl3WQQoQ0', title: 'Someone Like You', artist: 'Adele', mood: '감성' },
    { videoId: '1vrEljMfXYo', title: 'Hurt', artist: 'Johnny Cash', mood: '감성' },
    { videoId: 'RBumgq5yVrA', title: 'Photograph', artist: 'Ed Sheeran', mood: '추억' },
    { videoId: 'SpSMoBp8awM', title: '서른 즈음에', artist: '김광석', mood: '감성' },
    { videoId: 'bo_efYhYU2A', title: '비도 오고 그래서', artist: '헤이즈', mood: '비' },
  ],
  dawn: [
    { videoId: 'GY1KzHXGGgc', title: '새벽에 걸려온 전화', artist: '한동근', mood: '새벽' },
    { videoId: 'LkVv3yvf6WA', title: '밤이 되니까', artist: '어반자카파', mood: '새벽' },
    { videoId: 'bKtvkv1gpto', title: '새벽 두시 반', artist: '가을방학', mood: '새벽' },
    { videoId: '5bBcFHIoVb4', title: '새벽감성', artist: '이하이', mood: '새벽' },
    { videoId: 'dWUc_8OSYNM', title: 'Night Changes', artist: 'One Direction', mood: '밤' },
    { videoId: 'V1Pl8CzNzCw', title: 'Skinny Love', artist: 'Bon Iver', mood: '새벽' },
    { videoId: 'pUjE9H8QlA4', title: "Comptine d'un autre été", artist: 'Yann Tiersen', mood: '새벽' },
    { videoId: 'hT_nvWreIhg', title: 'Clair de Lune', artist: 'Debussy', mood: '몽환' },
    { videoId: '7maJOI3QMu0', title: 'Weightless', artist: 'Marconi Union', mood: '잔잔' },
    { videoId: 'ktvTqknDobU', title: 'Creep', artist: 'Radiohead', mood: '새벽' },
  ],
  focus: [
    { videoId: 'jfKfPfyJRdk', title: 'lofi hip hop radio', artist: 'Lofi Girl', mood: '집중' },
    { videoId: '5qap5aO4i9A', title: 'lofi beats to study to', artist: 'Lofi Girl', mood: '집중' },
    { videoId: 'lTRiuFIWV54', title: '1 Hour Study Music', artist: 'Chillhop', mood: '공부' },
    { videoId: 'DWcJFNfaw9c', title: 'Coffee Shop Ambience', artist: 'Calmed By Nature', mood: '카페' },
    { videoId: 'tNkZsRW7h2c', title: '공부할 때 듣는 클래식', artist: 'Classical Music', mood: '집중' },
    { videoId: 'WPni755-Krg', title: 'Deep Focus Music', artist: 'Greenred Productions', mood: '딥포커스' },
    { videoId: 'MYPVQccHhAQ', title: 'Studying Music', artist: 'Yellow Brick Cinema', mood: '공부' },
    { videoId: 'HSOtku1j600', title: 'Interstellar Main Theme', artist: 'Hans Zimmer', mood: '집중' },
    { videoId: 'WUvTyaaNkzM', title: 'Experience', artist: 'Ludovico Einaudi', mood: '집중' },
    { videoId: 'rP35T2Xv_7M', title: 'Piano Concentration', artist: 'Peaceful Piano', mood: '피아노' },
  ],
  rain: [
    { videoId: 'bo_efYhYU2A', title: '비도 오고 그래서', artist: '헤이즈', mood: '비' },
    { videoId: '2ZR4ai-KpMc', title: '하루 끝', artist: '아이유', mood: '잔잔' },
    { videoId: 'pUjE9H8QlA4', title: "Comptine d'un autre été", artist: 'Yann Tiersen', mood: '피아노' },
    { videoId: 'V1bFr2SWP1I', title: 'A Rainy Day in Seoul', artist: 'Korean Jazz', mood: '비' },
    { videoId: 'eHO_MkVnBYA', title: '빗소리 + 피아노', artist: 'Relaxing Music', mood: '빗소리' },
    { videoId: 'hT_nvWreIhg', title: 'Clair de Lune', artist: 'Debussy', mood: '클래식' },
    { videoId: 'so6ExplQlaY', title: 'River Flows in You', artist: 'Yiruma', mood: '피아노' },
    { videoId: 'kno30z9AhrA', title: 'Kiss The Rain', artist: 'Yiruma', mood: '피아노' },
    { videoId: 'WUvTyaaNkzM', title: 'Experience', artist: 'Ludovico Einaudi', mood: '잔잔' },
    { videoId: 'rP35T2Xv_7M', title: 'Peaceful Piano for Rain', artist: 'Peaceful Piano', mood: '비' },
  ],
  walk: [
    { videoId: 'dTa2Bzlbjv0', title: '봄날', artist: 'BTS', mood: '산책' },
    { videoId: 'jeqdYqsrsA0', title: 'Walking On Sunshine', artist: 'Katrina', mood: '신남' },
    { videoId: 'ru0K8uYEZWw', title: 'Happy', artist: 'Pharrell Williams', mood: '신남' },
    { videoId: 'ZbZSe6N_BXs', title: 'Happy Together', artist: 'The Turtles', mood: '산책' },
    { videoId: 'CevxZvSJLk8', title: 'Lovely Day', artist: 'Bill Withers', mood: '맑음' },
    { videoId: 'fRh_vgS2dFE', title: "Don't Stop Me Now", artist: 'Queen', mood: '에너지' },
    { videoId: 'y6Sxv-sUYtM', title: 'Butter', artist: 'BTS', mood: '신남' },
    { videoId: 'kXYiU_JCYtU', title: 'Numb Little Bug', artist: 'Em Beihold', mood: '편안' },
    { videoId: 'U4hShMEk1Ew', title: '너의 모든 순간', artist: '성시경', mood: '산책' },
    { videoId: 'OPf0YbXqDm0', title: 'Uptown Funk', artist: 'Bruno Mars', mood: '에너지' },
  ],
  blank: [
    { videoId: '7maJOI3QMu0', title: 'Weightless', artist: 'Marconi Union', mood: '힐링' },
    { videoId: 'lFcSrYw-ARY', title: 'Gymnopédie No.1', artist: 'Erik Satie', mood: '몽환' },
    { videoId: 'hT_nvWreIhg', title: 'Clair de Lune', artist: 'Debussy', mood: '클래식' },
    { videoId: 'WUvTyaaNkzM', title: 'Experience', artist: 'Ludovico Einaudi', mood: '잔잔' },
    { videoId: 'BHACKCNDMW8', title: 'Ambient Relaxation', artist: 'Brian Eno', mood: '앰비언트' },
    { videoId: 'UfcAVejslrU', title: 'Nuvole Bianche', artist: 'Ludovico Einaudi', mood: '피아노' },
    { videoId: 'so6ExplQlaY', title: 'River Flows in You', artist: 'Yiruma', mood: '힐링' },
    { videoId: 'kno30z9AhrA', title: 'Kiss The Rain', artist: 'Yiruma', mood: '피아노' },
    { videoId: 'rP35T2Xv_7M', title: 'Peaceful Piano', artist: 'Peaceful Piano', mood: '힐링' },
    { videoId: 'jfKfPfyJRdk', title: 'Lofi Chill Beats', artist: 'Lofi Girl', mood: '릴렉스' },
  ],
};

const EMOTION_PROFILES: Record<string, { label: string; emoji: string; moodTag: string }> = {
  sad:   { label: '우울',     emoji: '😔', moodTag: '감성' },
  dawn:  { label: '새벽감성', emoji: '🌙', moodTag: '새벽' },
  focus: { label: '집중',     emoji: '🔥', moodTag: '집중' },
  rain:  { label: '비오는날', emoji: '🌧', moodTag: '비' },
  walk:  { label: '혼자걷기', emoji: '🚶', moodTag: '산책' },
  blank: { label: '멍때리기', emoji: '☁️', moodTag: '힐링' },
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateLocalRecommendation(
  emotion: string,
  diary?: string
): RecommendResponse {
  console.log('[FLOW][LOCAL] generateLocalRecommendation:', emotion);

  const tracks = CATALOG[emotion] ?? CATALOG.blank;
  const profile = EMOTION_PROFILES[emotion] ?? EMOTION_PROFILES.blank;

  const shuffled = shuffle(tracks).slice(0, 10);

  const videos: VideoItem[] = shuffled.map((t) => ({
    videoId: t.videoId,
    title: t.title,
    artist: t.artist,
    channelTitle: t.artist,
    thumbnailUrl: `https://img.youtube.com/vi/${t.videoId}/mqdefault.jpg`,
    youtubeUrl: `https://www.youtube.com/watch?v=${t.videoId}`,
    mood: t.mood,
    moodTag: t.mood,
  }));

  console.log('[FLOW][LOCAL] generated', videos.length, 'tracks for', emotion);

  return {
    emotion,
    emotionLabel: profile.label,
    emotionEmoji: profile.emoji,
    moodTag: profile.moodTag,
    diary: diary ?? null,
    playback: {
      tier: 'videoIds',
      videos,
      totalCount: videos.length,
    },
    meta: {
      videoCount: videos.length,
      source: 'local_catalog',
      timestamp: Date.now(),
    },
  };
}
