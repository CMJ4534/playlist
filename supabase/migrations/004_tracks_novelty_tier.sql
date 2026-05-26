-- 추천 다양성: familiar / mid / hidden
alter table public.tracks
  add column if not exists novelty_tier text;

alter table public.tracks
  drop constraint if exists tracks_novelty_tier_check;

alter table public.tracks
  add constraint tracks_novelty_tier_check
  check (
    novelty_tier is null
    or novelty_tier in ('familiar', 'mid', 'hidden')
  );

create index if not exists tracks_novelty_tier_idx on public.tracks (novelty_tier);

comment on column public.tracks.novelty_tier is '추천 다양성 티어: familiar(대중) | mid | hidden(숨은곡)';
