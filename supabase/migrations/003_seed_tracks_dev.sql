-- 개발용 샘플 (로컬·스테이징). 프로덕션은 별도 시드 전략 사용.
insert into public.tracks (
  id,
  title,
  artist,
  youtube_id,
  thumbnail_url,
  mood_tags,
  energy_level,
  duration_sec
) values
  (
    'a0000000-0000-4000-8000-000000000001',
    'Ditto',
    'NewJeans',
    'Km71Rr9K-Bw',
    'https://img.youtube.com/vi/Km71Rr9K-Bw/hqdefault.jpg',
    array['몽환적', '잔잔한', '우울'],
    4,
    185
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    'Super Shy',
    'NewJeans',
    'ArmDp-zijig',
    'https://img.youtube.com/vi/ArmDp-zijig/hqdefault.jpg',
    array['밝은', '설렘'],
    6,
    150
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    'Hype Boy',
    'NewJeans',
    '11t7c7UJfNM',
    'https://img.youtube.com/vi/11t7c7UJfNM/hqdefault.jpg',
    array['경쾌한', '집중'],
    7,
    180
  )
on conflict (youtube_id) do update set
  title = excluded.title,
  artist = excluded.artist,
  mood_tags = excluded.mood_tags,
  energy_level = excluded.energy_level;
