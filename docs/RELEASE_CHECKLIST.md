# Moodplay 출시 체크리스트

출시 전 아래 항목을 순서대로 확인하세요. 상세 배포 설정은 [DEPLOYMENT.md](./DEPLOYMENT.md) 참고.

---

## 1. 빌드 · 인프라

### EAS Build

- [ ] `npx eas login`
- [ ] `npx eas init` (프로젝트 연결)
- [ ] `app.json` — `ios.bundleIdentifier`, `android.package` 설정
- [ ] EAS Secrets 등록 (`EXPO_PUBLIC_*`)
- [ ] `eas build --profile preview` — **실기기** QA
- [ ] `eas build --profile production`
- [ ] `eas submit` (스토어 제출 시)

### Supabase Production

- [ ] prod 프로젝트 생성 (dev/staging 분리)
- [ ] `supabase db push` (migrations)
- [ ] `npm run seed:tracks` (prod service role)
- [ ] RLS 정책 검토 (`tracks` read-only for anon)

### Edge Function

- [ ] `supabase functions deploy recommend`
- [ ] Secrets: `CLAUDE_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `YOUTUBE_API_KEY`(선택)
- [ ] `EXPO_PUBLIC_RECOMMENDATION_SOURCE=supabase` in production build

---

## 2. Seed · Track 품질

```bash
npm run verify:tracks
YOUTUBE_API_KEY=xxx npm run verify:tracks:playback
# 필요 시
npx tsx scripts/syncSeedMetaFromReport.ts --disable-embedding
npm run seed:apply-replacements
npm run seed:tracks
```

- [ ] `verify:tracks` — invalid 0건
- [ ] `verify:tracks:playback` — needsFix 처리 (`catalogMeta.json` / `replacements.json`)
- [ ] prod DB seed count ≥ 80 unique tracks

---

## 3. 법무 · 스토어 문서

- [ ] **개인정보 처리방침** URL (웹, 앱 설정 링크)
- [ ] **이용약관** (선택, 권장)
- [ ] **YouTube / Google API 고지**
  - YouTube API Services Terms
  - “동영상 콘텐츠는 YouTube에서 제공”
- [ ] 스토어 설명에 음원 소스·제한 사항 명시
- [ ] 연령 등급 · UGC(상황 한 줄 입력) 고지

---

## 4. 브랜딩 · 에셋

- [ ] App icon 최종 (`assets/images/icon.png`)
- [ ] Splash 배경 `#0B0D14` (다크 통일)
- [ ] Adaptive icon (Android)
- [ ] 스토어 스크린샷 5~8장 (감정 선택 → 추천 → 재생)

---

## 5. 실기기 E2E 테스트

개발 빌드에서 `EXPO_PUBLIC_PLAYBACK_DEBUG=1` (기본 __DEV__ on) → **Playback DEBUG** 오버레이 확인.

| # | 시나리오 | Pass |
|---|----------|------|
| 1 | 감정 선택 → 추천 → 재생 | ☐ |
| 2 | MiniPlayer 진행바·버퍼링 표시 | ☐ |
| 3 | next 연타 (9초 내 쿨다운) | ☐ |
| 4 | embed 제한 곡 → 자동 skip | ☐ |
| 5 | 백그라운드 → 포그라운드 resume | ☐ |
| 6 | 앱 kill → 재실행 → queue·이어 듣기 | ☐ |
| 7 | 탭 전환 시 MiniPlayer 유지 | ☐ |
| 8 | 동일 감정 3회 추천 — 반복 곡 감소 | ☐ |

---

## 6. TestFlight / 내부 테스트

- [ ] iOS TestFlight 내부 테스터 5명+
- [ ] Android internal testing track
- [ ] 피드백 채널 (폼/슬랙)
- [ ] 크래시 모니터링 (Sentry 등 — 선택)

---

## 7. Analytics · Observability

- [ ] DEV에서 `[analytics]` 이벤트 콘솔 확인
- [ ] `logAnalyticsInsights()` — fallback/skip/error 집계
- [ ] prod: `registerAnalyticsProvider` (Mixpanel 등) 연동
- [ ] `EXPO_PUBLIC_SENTRY_DSN` 설정 후 `@sentry/react-native` 설치

## 8. 출시 직전 최종

- [ ] prod env로 smoke test 1회
- [ ] `EXPO_PUBLIC_PLAYBACK_DEBUG` prod에서 off (`__DEV__` false면 자동)
- [ ] 버전·빌드 번호 bump (`app.json` / EAS autoIncrement)
- [ ] Changelog 작성

---

## 운영 참고

| 작업 | 명령 |
|------|------|
| 재생 실패 리포트 | 앱 내 `playbackHealthStore` + DEV overlay `global fails` |
| seed disable | `src/data/seeds/catalogMeta.json` |
| ID 교체 | `src/data/seeds/replacements.json` |
| 다양성 점수 | DEV 콘솔 `[recommendation:diversity]` |
