-- Beta 피드백 수집 테이블
create table if not exists feedback_inbox (
  id text primary key,
  sentiment text not null check (sentiment in ('great', 'ok', 'poor')),
  comment text,
  category text not null default 'playlist_quality',
  emotion_id text,
  playlist_session_id text,
  strategy_id text,
  strategy_version text,
  experiment_variant text,
  tracks_played integer not null default 0,
  tracks_skipped integer not null default 0,
  queue_length integer not null default 0,
  device_id text,
  app_version text,
  platform text,
  created_at timestamptz not null default now(),
  uploaded_at timestamptz not null default now()
);

create index if not exists idx_feedback_emotion on feedback_inbox (emotion_id);
create index if not exists idx_feedback_sentiment on feedback_inbox (sentiment);
create index if not exists idx_feedback_strategy on feedback_inbox (strategy_id);
create index if not exists idx_feedback_created on feedback_inbox (created_at desc);

comment on table feedback_inbox is '베타 사용자 피드백 — 감정별/전략별 만족도 분석용';
