/** Supabase `tracks` 테이블 행 (snake_case) */
export type TrackRow = {
  id: string;
  title: string;
  artist: string;
  youtube_id: string;
  thumbnail_url: string;
  mood_tags: string[] | null;
  energy_level: number | null;
  novelty_tier: string | null;
  duration_sec: number | null;
  created_at: string;
};
