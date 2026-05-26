-- Moodplay: tracks catalog (YouTube-backed)
-- Run via Supabase CLI or SQL editor

create extension if not exists "pgcrypto";

create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  artist text not null,
  youtube_id text not null,
  thumbnail_url text not null,
  mood_tags text[] default '{}',
  duration_sec integer,
  created_at timestamptz not null default now(),

  constraint tracks_youtube_id_unique unique (youtube_id),
  constraint tracks_duration_sec_positive check (
    duration_sec is null or duration_sec > 0
  )
);

create index if not exists tracks_mood_tags_gin on public.tracks using gin (mood_tags);
create index if not exists tracks_created_at_idx on public.tracks (created_at desc);

comment on table public.tracks is '재생·추천에 사용하는 곡 카탈로그';
comment on column public.tracks.youtube_id is 'YouTube video id';
comment on column public.tracks.thumbnail_url is '표시용 썸네일 URL (없으면 앱에서 youtube id로 유도)';
comment on column public.tracks.mood_tags is '감정·상황 매칭용 태그';

-- MVP: anon read (RLS 정책은 프로젝트 인증 전략에 맞게 조정)
alter table public.tracks enable row level security;

create policy "tracks_select_anon"
  on public.tracks
  for select
  to anon, authenticated
  using (true);
