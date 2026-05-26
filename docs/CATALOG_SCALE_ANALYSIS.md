# 카탈로그 규모별 추천 품질 분석

## 1. 현황 요약

| 지표 | 현재 (~100곡) | 목표 (300곡) | 장기 (1000곡) |
|------|:---:|:---:|:---:|
| 감정 카테고리 | 6개 | 6~8개 | 8~12개 |
| 카테고리당 평균 곡 수 | ~17곡 | ~50곡 | ~100곡+ |
| 추천 1회당 선택 가능 풀 | 12~18곡 | 35~50곡 | 80~100곡 |
| 동일 세션 반복 확률 | **높음 (60%+)** | 중간 (25%) | 낮음 (<10%) |
| 아티스트 다양성 | 제한적 | 양호 | 풍부 |

---

## 2. 100곡 규모 (현재)

### 품질 특성
- 카테고리당 15~20곡 → **exclude list 적용 시 선택 풀이 급감**
- 3~4회 추천 후 반복 곡 체감 시작
- 특정 아티스트(방탄소년단, Stray Kids 등) 과다 노출
- hidden gem 비율 낮아 "항상 같은 곡" 느낌

### 병목
| 병목 | 영향도 | 설명 |
|------|:---:|------|
| exclude 고갈 | **P0** | `MAX_RECENT_GLOBAL=72`이면 전체 seed의 ~70%가 exclude됨 |
| 아티스트 중복 | **P1** | maxPerArtist=1 적용 시 가용 풀 추가 감소 |
| novelty 편향 | **P1** | familiar 위주 → hidden gem 부족 |
| 에너지 범위 | P2 | 카테고리별 에너지 필터 후 5~10곡만 남는 경우 |

### 권장 조치
1. `MAX_RECENT_GLOBAL`을 48~56으로 하향 (현재 72)
2. 카테고리당 최소 20곡 확보
3. 각 카테고리에 hidden 3곡 이상 추가

---

## 3. 300곡 규모 (목표)

### 품질 특성
- 카테고리당 ~50곡 → **exclude 후에도 30곡+ 가용**
- 10회 이상 추천해도 반복 체감 낮음
- 아티스트 다양성으로 자연스러운 발견 경험
- novelty 비율 설계 가능 (familiar 40%, mid 35%, hidden 25%)

### 병목
| 병목 | 영향도 | 설명 |
|------|:---:|------|
| 검증 부담 | **P1** | 300곡 playback verify에 ~5분 소요 |
| 메타 품질 | **P1** | 자동 수집 시 energyLevel/moodTags 정확도 |
| 카테고리 경계 | P2 | 일부 곡이 여러 감정에 걸침 |
| 스토리지 | P3 | seed JSON ~150KB → 무시 가능 |

### 권장 구조
```
src/data/seeds/
  sad.ts         → 50~60곡
  dawn.ts        → 40~50곡
  focus.ts       → 50~60곡
  rain.ts        → 40~50곡
  walking.ts     → 40~50곡
  blank.ts       → 30~40곡
```

### 추천 알고리즘 조정
- `MAX_RECENT_GLOBAL` → 96 (72 → 96)
- `MAX_RECENT_PER_EMOTION` → 48 (32 → 48)
- `OVERUSE_THRESHOLD` → 4 (3 → 4)
- exposure decay weight → 2.0 (1.5 → 2.0)
- hidden gem min ratio → 0.20 (0.15 → 0.20)

---

## 4. 1000곡 규모 (장기)

### 품질 특성
- 카테고리당 100곡+ → **거의 무한한 다양성**
- 사용자별 취향 반영으로 개인화 가능
- 서브 감정 세분화 가능 (예: sad → 이별, 그리움, 고독, 위로)
- "오늘의 숨겨진 곡" 등 디스커버리 피처 가능

### 병목
| 병목 | 영향도 | 설명 |
|------|:---:|------|
| 수집·검증 비용 | **P0** | 1000곡 수동 관리 불가 → 파이프라인 필수 |
| 메타데이터 품질 | **P0** | energyLevel/emotionalIntensity 수동 정제 필요 |
| 추천 지연 | **P1** | 풀 크기 증가 → 선택 알고리즘 O(n²) 주의 |
| 카테고리 확장 | **P1** | 6개 → 8~12개로 확장 필요 |
| 번들 사이즈 | **P1** | seed JSON ~500KB+ → lazy load 검토 |
| 라이선스·저작권 | P2 | YouTube embed 가능 여부 주기적 점검 |

### 권장 구조 변경
```
src/data/seeds/
  index.ts             → 카테고리 레지스트리
  categories/
    sad/
      core.ts          → 30곡 (항상 로드)
      extended.ts      → 70곡+ (lazy)
    dawn/
      core.ts
      extended.ts
    ...
```

### 추천 알고리즘 조정
- 단순 배열 순회 → **인덱스 기반 선택** (mood tag index)
- 사용자별 exposure history 분리
- collaborative filtering 도입 검토
- A/B 테스트 가능한 전략 패턴

---

## 5. 규모별 핵심 지표 비교

| 지표 | 100곡 | 300곡 | 1000곡 |
|------|:---:|:---:|:---:|
| 5세션 내 반복 곡 비율 | ~60% | ~20% | <5% |
| 아티스트 다양성 (unique/total) | 0.7 | 0.85 | 0.92+ |
| exclude 후 가용 풀 | 15~25곡 | 100~150곡 | 500곡+ |
| 카테고리 최소 곡 수 | 12곡 | 35곡 | 80곡 |
| hidden gem 비율 | 10~15% | 20~25% | 25~30% |
| 관리 비용 (시간/주) | 1h | 3h | 파이프라인 자동화 |
| seed 데이터 크기 | ~50KB | ~150KB | ~500KB |
| verify 소요 시간 | 1분 | 5분 | 15분+ |

---

## 6. 확장 로드맵

### Phase 1: 100 → 300곡 (현재 우선)
1. `scripts/catalog/` 파이프라인으로 카테고리별 30~40곡 추가 수집
2. `enrichTracks.ts`로 메타 자동 보강 → 수동 리뷰
3. `dedupeTracks.ts`로 중복 제거 후 seed 파일에 머지
4. `verifyTracksPlayback.ts`로 전체 재생 검증
5. `catalogAnalysis` 리포트로 imbalance 확인·보정

### Phase 2: 300 → 1000곡
1. 카테고리 세분화 (예: `sad-breakup`, `sad-longing`, `sad-comfort`)
2. 곡별 scoring 필드 (freshness, familiarity, emotionalIntensity) 활성화
3. 사용자 exposure history 고도화 (per-emotion decay)
4. 번들 최적화 (core/extended 분리 로드)

### Phase 3: 1000곡+
1. 서버 사이드 카탈로그 관리 (Supabase)
2. 주기적 자동 검증 (cron)
3. 사용자 행동 기반 자동 scoring 업데이트
4. collaborative filtering / 유사 사용자 추천

---

## 7. 수집 파이프라인 사용법

```bash
# 1. 곡 수집 (YouTube ID / URL)
npx tsx scripts/catalog/collectTracks.ts sad \
  dQw4w9WgXcQ \
  "https://youtu.be/abc123" \
  XYZ789abcde

# 2. 검증 (playback + 중복)
npx tsx scripts/catalog/validateTracks.ts \
  scripts/catalog/collected/sad-12345.json

# 3. 보강 (mood/energy/novelty 자동 추정)
npx tsx scripts/catalog/enrichTracks.ts \
  scripts/catalog/collected/validated-sad-12345.json

# 4. 중복 제거 + 카탈로그 분석
npx tsx scripts/catalog/dedupeTracks.ts \
  scripts/catalog/collected/enriched-sad-12345.json

# 5. 전체 재생 검증
YOUTUBE_API_KEY=... npx tsx scripts/verifyTracksPlayback.ts
```

각 단계의 출력 파일을 리뷰한 후, 최종 enriched JSON의 곡을 해당 seed 파일(예: `sad.ts`)에 추가합니다.
