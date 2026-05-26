# 베타 피드백 운영 분석

## 1. 사용자가 가장 좋아할 가능성이 높은 포인트

### 즉각적 가치 (첫 세션)
| 포인트 | 이유 | 측정 지표 |
|-------|------|----------|
| **감정 선택 → 즉시 추천** | 복잡한 설정 없이 감정만 고르면 음악이 나옴 | 첫 추천까지 소요 시간, 이탈률 |
| **에너지 흐름 (energy arc)** | 처음엔 잔잔 → 점점 고조 → 다시 안정의 자연스러운 곡 순서 | skip rate 전반/중반/후반 |
| **다크 감성 UI** | 음악 앱 특유의 몰입감 있는 어두운 테마 | 체류 시간 |
| **한줄 상황 입력** | "비 오는 밤" 같은 상황에 맞춘 개인화 느낌 | 상황 입력 비율, 만족도 |

### 반복 사용 가치 (2~5일)
| 포인트 | 이유 | 측정 지표 |
|-------|------|----------|
| **저장 → 재방문** | 좋았던 플레이리스트를 저장하고 다시 들음 | 저장 비율, 재생 비율 |
| **감정 기반 루틴** | "매일 아침 focus" 같은 습관 형성 | DAU/WAU, 루틴 사용률 |
| **숨겨진 곡 발견** | hidden gem으로 "이런 곡이 있었어?" 경험 | hidden gem 재생 완료율 |

---

## 2. 사용자가 가장 실망할 가능성이 높은 포인트

### P0 — 즉시 이탈 유발
| 포인트 | 예상 반응 | 해결 방안 |
|-------|---------|----------|
| **곡이 재생되지 않음** | "앱이 고장났나?" → 즉시 삭제 | 플레이어 안정화 (HiddenYoutubePlayer 개선 완료), 재생 실패 시 자동 skip + 사용자 알림 |
| **항상 같은 곡** | "맨날 같은 거만 나와" → 3일 내 이탈 | 카탈로그 확장 (100→300곡), exposure decay 적용 |
| **추천이 감정과 안 맞음** | "슬프다고 했는데 왜 밝은 곡?" | emotionCuration 프로필 정교화, 피드백 루프 |

### P1 — 지속 사용 저해
| 포인트 | 예상 반응 | 해결 방안 |
|-------|---------|----------|
| **앱 재시작 시 재생 끊김** | "아까 듣던 거 어디 갔지?" | playerStore 복원 (구현 완료), 상태 유지 UX 개선 |
| **백그라운드 재생 불안정** | "다른 앱 쓰다 오면 멈춤" | usePlaybackAppState 개선 (구현 완료) |
| **추천 로딩 느림** | "왜 이렇게 오래 걸려?" | Edge Function 최적화, 로딩 UX (구현 완료) |

### P2 — 기대와 현실 간극
| 포인트 | 예상 반응 | 해결 방안 |
|-------|---------|----------|
| **YouTube 광고** | "광고 없는 줄 알았는데" | YouTube Premium 안내, 광고 없는 대안 탐색 |
| **오프라인 불가** | "지하철에서 안 들림" | 향후 다운로드/캐시 기능 검토 |
| **곡 수가 적음** | "선택의 폭이 좁음" | 카탈로그 확장 로드맵 실행 |

---

## 3. 첫 3일 내 삭제 원인 분석

### Day 1 — 첫인상 실패 (삭제율 40~50%)
```
설치 → 감정 선택 → 추천 로딩 → [여기서 이탈]
                                ↓
                           재생 안 됨 → 삭제
                           곡이 안 맞음 → 닫기
                           로딩 너무 길음 → 닫기
```

| 삭제 원인 | 예상 비중 | 대응 |
|----------|:---:|------|
| 재생 실패 (무음, 에러) | 30% | 플레이어 안정화 + 에러 시 명확한 메시지 |
| 첫 추천 불일치 | 25% | 온보딩에서 취향 힌트 수집 → 첫 추천 정확도 향상 |
| "이게 뭐하는 앱이지?" | 20% | 온보딩 가치 전달 강화 (3초 내 핵심 메시지) |
| 로딩 느림 / 기술 문제 | 15% | MIN_LOADING_MS 최적화, 폴백 추천 속도 개선 |
| 그냥 관심 없음 | 10% | (대응 불가 — 자연 이탈) |

### Day 2~3 — 반복 체감 (추가 삭제 20~30%)
| 삭제 원인 | 예상 비중 | 대응 |
|----------|:---:|------|
| 곡 반복 (3~4회 추천 후 같은 곡) | 40% | **카탈로그 300곡 확장** + exposure decay |
| 추천 품질 일관성 부족 | 25% | 전략 A/B 테스트 → 최적 전략 고정 |
| 재방문 동기 부족 | 20% | 홈 화면 개인화, 일일 추천, 루틴 알림 |
| 기능 부족 (검색, 공유 등) | 15% | 핵심 기능 우선 개발 (공유 카드 구현 완료) |

---

## 4. 피드백 수집 → 개선 루프

```
[사용자]
   ↓ 플레이리스트 재생 후
   ↓ 👍/😐/👎 + 한줄 코멘트
   ↓
[feedbackStore] ← pending queue
   ↓ processFeedbackQueue()
[feedback_inbox] (Supabase)
   ↓
[feedbackInsights] ← 자동 분석
   ↓
[운영자 대시보드]
   ├─ 감정별 불만족 감지
   ├─ 반복/분위기 불만 키워드 추적
   ├─ 전략별 만족도 비교
   └─ P0 이슈 자동 알림
   ↓
[개선 실행]
   ├─ 카탈로그 보강 (감정별 곡 추가)
   ├─ 추천 전략 조정 (A/B)
   ├─ 플레이어 안정성 패치
   └─ UX 개선
```

---

## 5. 핵심 베타 지표 (KPI)

| 지표 | 목표 (베타) | 위험 수준 | 측정 방법 |
|-----|:---:|:---:|------|
| 일일 활성 비율 (DAU/설치) | ≥20% | <10% | analytics home_screen_view |
| 첫 추천 완료율 | ≥70% | <50% | recommendation_success / 설치 |
| 평균 skip rate | ≤25% | >40% | track_skip / track_play |
| 피드백 응답률 | ≥15% | <5% | feedback_submitted / playlist_completed |
| 만족도 (great 비율) | ≥40% | <25% | playlist_quality_rated sentiment=great |
| 반복 불만 비율 | ≤10% | >20% | 코멘트 키워드 분석 |
| 3일 잔존율 | ≥30% | <15% | 세션 기반 |
| 재생 실패율 | ≤5% | >15% | playback_error / track_play |

---

## 6. 피드백 기반 우선순위 결정 프레임워크

```
[피드백 insight 수집]
       ↓
  ┌─── critical 있는가? ───┐
  │ YES                    │ NO
  ↓                        ↓
[즉시 대응]          [warning 2개 이상?]
  │                    │ YES       │ NO
  │                    ↓           ↓
  │              [주간 개선]    [관찰 유지]
  │
  ├─ 재생 실패 → 플레이어 패치
  ├─ 반복 불만 → 카탈로그 확장
  ├─ 분위기 불일치 → curation 조정
  └─ 전략 차이 → A/B 조정
```

---

## 7. Supabase 쿼리 예시 (운영자용)

```sql
-- 감정별 만족도 분포
SELECT emotion_id,
       sentiment,
       COUNT(*) as cnt
FROM feedback_inbox
WHERE created_at > now() - interval '7 days'
GROUP BY emotion_id, sentiment
ORDER BY emotion_id, sentiment;

-- 반복 불만 코멘트
SELECT id, emotion_id, comment, created_at
FROM feedback_inbox
WHERE comment ILIKE '%반복%'
   OR comment ILIKE '%같은 곡%'
   OR comment ILIKE '%또 나%'
ORDER BY created_at DESC
LIMIT 20;

-- 전략별 만족도 비교
SELECT strategy_id,
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE sentiment = 'great') as great,
       COUNT(*) FILTER (WHERE sentiment = 'poor') as poor,
       ROUND(
         COUNT(*) FILTER (WHERE sentiment = 'great')::numeric /
         NULLIF(COUNT(*), 0) * 100, 1
       ) as great_pct
FROM feedback_inbox
GROUP BY strategy_id;

-- 일별 피드백 추이
SELECT DATE(created_at) as day,
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE sentiment = 'great') as great,
       COUNT(*) FILTER (WHERE sentiment = 'poor') as poor
FROM feedback_inbox
GROUP BY DATE(created_at)
ORDER BY day DESC
LIMIT 14;
```
