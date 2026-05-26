# recommend Edge Function

## Flow

```
POST /recommend
  → claudeClient (Claude API or mock plan)
  → recommendationBuilder (validate/normalize)
  → trackResolver (Supabase tracks + youtubeResolver)
  → RecommendResponse
```

## Env (Supabase secrets)

| Secret | Required | Description |
|--------|----------|-------------|
| `SUPABASE_URL` | auto | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | DB read for tracks |
| `CLAUDE_API_KEY` | no | 없으면 mock plan |
| `CLAUDE_MODEL` | no | default `claude-sonnet-4-20250514` |
| `YOUTUBE_API_KEY` | no | youtube_id 없는 행 보완 |
| `RECOMMEND_TIMEOUT_MS` | no | default 28000 |

## Local

```bash
supabase functions serve recommend --env-file supabase/.env.local
```

## Deploy

```bash
supabase functions deploy recommend
```

## App

Set `EXPO_PUBLIC_RECOMMENDATION_SOURCE=supabase` and Supabase URL/anon key.
