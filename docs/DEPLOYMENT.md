# Moodplay 배포 준비 체크리스트

## Expo EAS Build

| 항목 | 상태 | 메모 |
|------|------|------|
| `eas.json` 프로필 (development / preview / production) | ✅ 템플릿 추가 | `eas build --profile production` |
| EAS 프로젝트 연결 | ⬜ | `npx eas init` |
| iOS bundle identifier / Android package | ⬜ | `app.json`에 `ios.bundleIdentifier`, `android.package` 추가 |
| Apple Developer / Google Play 계정 | ⬜ | 스토어 제출용 |
| `eas build --profile preview` 실기기 테스트 | ⬜ | YouTube WebView는 dev client·실기기 필수 |

## 환경변수

### 앱 (`.env` → EAS Secrets)

| 변수 | 용도 |
|------|------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon |
| `EXPO_PUBLIC_RECOMMENDATION_SOURCE` | `mock` \| `supabase` |
| `EXPO_PUBLIC_YOUTUBE_API_KEY` | (선택) resolveTrack |

### Supabase Edge (`supabase secrets set`)

| Secret | 용도 |
|--------|------|
| `CLAUDE_API_KEY` | 추천 큐레이션 |
| `CLAUDE_MODEL` | 모델명 |
| `SUPABASE_SERVICE_ROLE_KEY` | DB track resolve |
| `YOUTUBE_API_KEY` | (선택) Edge resolve |

### 로컬 전용 (커밋 금지)

| 변수 | 용도 |
|------|------|
| `SUPABASE_SERVICE_ROLE_KEY` | `npm run seed:tracks` |

## Supabase Production 분리

- [ ] 별도 Supabase 프로젝트 (prod)
- [ ] `supabase db push` on prod
- [ ] `npm run seed:tracks` against prod
- [ ] `supabase functions deploy recommend --project-ref <prod>`
- [ ] dev/staging URL을 앱 빌드 프로필별로 분리

## Seed / Track 품질

```bash
npm run verify:tracks
YOUTUBE_API_KEY=xxx npm run verify:tracks:playback
# 리포트: scripts/reports/track-playback-report.json
# 수정: src/data/seeds/replacements.json → npm run seed:apply-replacements
npm run seed:tracks
```

## 앱 아이콘 / Splash

| 항목 | 현재 | 권장 |
|------|------|------|
| icon | `./assets/images/icon.png` | 브랜드 최종본 |
| splash | 흰 배경 `#ffffff` | `moodTheme.bg` (#0B0D14)와 통일 |
| adaptive icon | 흰 배경 | 다크 배경 권장 |

## 법무 / 스토어

- [ ] **개인정보 처리방침** URL (웹)
- [ ] **YouTube API / 재생 고지**: “YouTube에서 제공하는 콘텐츠”, API Services Terms 링크
- [ ] 오디오 백그라운드: YouTube ToS상 제3자 앱 백그라운드 재생 제한 — 현재는 foreground WebView 방식
- [ ] 연령 등급·콘텐츠: 사용자 생성 텍스트(한 줄 상황) 저장 여부 명시

## 스토어 심사 리스크

| 리스크 | 수준 | 대응 |
|--------|------|------|
| YouTube ToS (백그라운드·다운로드·광고 우회) | 높음 | iframe embed만, 다운로드/변환 없음 명시 |
| 음원 라이선스 표시 | 중간 | 곡 메타·썸네일은 YouTube 제공 |
| Supabase anon 키 노출 | 낮음 | RLS 필수, service role은 Edge만 |
| Edge `verify_jwt: false` | 중간 | prod에서 rate limit·API key 검토 |
| 빈 추천 / 재생 실패 | 중간 | 자동 skip·fallback 구현됨 |
