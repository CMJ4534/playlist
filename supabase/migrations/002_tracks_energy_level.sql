-- energy_level: 1(잔잔) ~ 10(강렬) — 추천 필터링용
alter table public.tracks
  add column if not exists energy_level smallint;

alter table public.tracks
  drop constraint if exists tracks_energy_level_range;

alter table public.tracks
  add constraint tracks_energy_level_range
  check (energy_level is null or (energy_level >= 1 and energy_level <= 10));

create index if not exists tracks_energy_level_idx on public.tracks (energy_level);

comment on column public.tracks.energy_level is '곡 에너지 1–10 (추천·Claude 컨텍스트)';
