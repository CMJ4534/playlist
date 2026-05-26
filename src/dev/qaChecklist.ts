/**
 * 실기기 QA 체크리스트 — 출시 전 수동·자동 검증 항목 관리.
 * status는 런타임에서 갱신하고, 결과를 Beta QA 화면에 표시한다.
 */

export type QaStatus = 'pass' | 'fail' | 'pending';

export type QaCategory =
  | 'recommendation'
  | 'playback'
  | 'background'
  | 'persistence'
  | 'sharing'
  | 'onboarding';

export type QaCheckItem = {
  id: string;
  category: QaCategory;
  title: string;
  description: string;
  status: QaStatus;
  lastTestedAt: number | null;
  /** 자동 검증 함수가 있으면 runAutoChecks()로 일괄 실행 */
  autoCheck?: () => QaStatus;
};

// ─── 체크리스트 정의 ────────────────────────────────

const items: QaCheckItem[] = [
  // recommendation
  {
    id: 'rec-01',
    category: 'recommendation',
    title: '감정 선택 → 추천 요청 성공',
    description: '감정 선택 후 추천 API가 tracks를 정상 반환하는지 확인',
    status: 'pending',
    lastTestedAt: null,
  },
  {
    id: 'rec-02',
    category: 'recommendation',
    title: 'fallback 정상 작동',
    description: 'Edge 실패 시 로컬 fallback이 즉시 트랙을 반환하는지 확인',
    status: 'pending',
    lastTestedAt: null,
  },
  {
    id: 'rec-03',
    category: 'recommendation',
    title: '추천 결과 중복곡 없음',
    description: '동일 youtubeId가 한 큐에 2회 이상 나오지 않는지 확인',
    status: 'pending',
    lastTestedAt: null,
  },
  {
    id: 'rec-04',
    category: 'recommendation',
    title: '추천 결과 mood 일관성',
    description: '선택한 감정과 반환된 곡의 moodTags 매칭 여부 확인',
    status: 'pending',
    lastTestedAt: null,
  },

  // playback
  {
    id: 'play-01',
    category: 'playback',
    title: '첫 곡 자동 재생',
    description: '큐 세팅 후 첫 곡이 3초 내 오디오 출력을 시작하는지 확인',
    status: 'pending',
    lastTestedAt: null,
  },
  {
    id: 'play-02',
    category: 'playback',
    title: '다음 곡 자동 전환',
    description: '트랙 종료 후 다음 곡이 자동으로 전환·재생되는지 확인',
    status: 'pending',
    lastTestedAt: null,
  },
  {
    id: 'play-03',
    category: 'playback',
    title: 'embed 제한 곡 자동 skip',
    description: 'embed_not_allowed 에러 시 다음 곡으로 넘어가는지 확인',
    status: 'pending',
    lastTestedAt: null,
  },
  {
    id: 'play-04',
    category: 'playback',
    title: '타임아웃 skip 동작',
    description: '18초 로딩 타임아웃 후 skipOnPlaybackError가 호출되는지 확인',
    status: 'pending',
    lastTestedAt: null,
  },
  {
    id: 'play-05',
    category: 'playback',
    title: 'MiniPlayer 진행바 동기화',
    description: '재생 중 positionSec / durationSec이 MiniPlayer에 실시간 반영되는지 확인',
    status: 'pending',
    lastTestedAt: null,
  },
  {
    id: 'play-06',
    category: 'playback',
    title: '10곡 연속 skip 시 에러 표시',
    description: 'MAX_CONSECUTIVE_SKIPS 도달 시 에러 메시지가 표시되는지 확인',
    status: 'pending',
    lastTestedAt: null,
  },

  // background
  {
    id: 'bg-01',
    category: 'background',
    title: '백그라운드 진입 시 pause',
    description: 'AppState background 전환 시 재생이 일시정지되는지 확인',
    status: 'pending',
    lastTestedAt: null,
  },
  {
    id: 'bg-02',
    category: 'background',
    title: '포그라운드 복귀 시 resume',
    description: '재생 중이었으면 포그라운드 복귀 시 자동 resume되는지 확인',
    status: 'pending',
    lastTestedAt: null,
  },
  {
    id: 'bg-03',
    category: 'background',
    title: '에러 상태에서 resume 방지',
    description: 'playbackStatus=error 일 때 포그라운드 복귀 시 resume되지 않는지 확인',
    status: 'pending',
    lastTestedAt: null,
  },

  // persistence
  {
    id: 'pers-01',
    category: 'persistence',
    title: '큐 persist + rehydrate',
    description: '앱 종료 후 재시작 시 큐와 currentIndex가 복원되는지 확인',
    status: 'pending',
    lastTestedAt: null,
  },
  {
    id: 'pers-02',
    category: 'persistence',
    title: 'rehydrate 시 isPlaying=false',
    description: '앱 재시작 시 isPlaying이 false로 초기화되는지 확인',
    status: 'pending',
    lastTestedAt: null,
  },
  {
    id: 'pers-03',
    category: 'persistence',
    title: '라이브러리 저장·복원',
    description: '플레이리스트 저장 후 앱 재시작 시 savedPlaylists가 유지되는지 확인',
    status: 'pending',
    lastTestedAt: null,
  },

  // sharing
  {
    id: 'share-01',
    category: 'sharing',
    title: '감성 카드 생성',
    description: '플레이리스트 상세에서 감성 카드 PNG 생성이 정상 동작하는지 확인',
    status: 'pending',
    lastTestedAt: null,
  },
  {
    id: 'share-02',
    category: 'sharing',
    title: '감성 카드 공유',
    description: '생성된 카드의 expo-sharing 공유가 정상 동작하는지 확인',
    status: 'pending',
    lastTestedAt: null,
  },

  // onboarding
  {
    id: 'onb-01',
    category: 'onboarding',
    title: '첫 실행 온보딩 표시',
    description: '새 설치 후 온보딩 3단계가 올바르게 표시되는지 확인',
    status: 'pending',
    lastTestedAt: null,
  },
  {
    id: 'onb-02',
    category: 'onboarding',
    title: '온보딩 완료 후 홈 진입',
    description: '온보딩 완료 표시 후 홈 화면에 진입하고, 다시 온보딩이 표시되지 않는지 확인',
    status: 'pending',
    lastTestedAt: null,
  },
  {
    id: 'onb-03',
    category: 'onboarding',
    title: '감정→추천→재생 첫 흐름',
    description: '온보딩 직후 감정 선택 → 추천 → 큐 세팅 → 재생까지 끊김 없이 진행되는지 확인',
    status: 'pending',
    lastTestedAt: null,
  },
];

// ─── 런타임 상태 관리 ────────────────────────────────

let _checklist: QaCheckItem[] = items.map((i) => ({ ...i }));

export function getQaChecklist(): readonly QaCheckItem[] {
  return _checklist;
}

export function getQaChecklistByCategory(
  category: QaCategory
): readonly QaCheckItem[] {
  return _checklist.filter((c) => c.category === category);
}

export function updateCheckStatus(
  id: string,
  status: QaStatus,
  at: number = Date.now()
): void {
  const item = _checklist.find((c) => c.id === id);
  if (item) {
    item.status = status;
    item.lastTestedAt = at;
  }
}

export function resetAllChecks(): void {
  _checklist = items.map((i) => ({ ...i }));
}

/** autoCheck가 있는 항목들을 자동 실행해 결과를 갱신한다 */
export function runAutoChecks(): { passed: number; failed: number; total: number } {
  let passed = 0;
  let failed = 0;
  const now = Date.now();

  for (const item of _checklist) {
    if (item.autoCheck) {
      const result = item.autoCheck();
      item.status = result;
      item.lastTestedAt = now;
      if (result === 'pass') passed++;
      else if (result === 'fail') failed++;
    }
  }

  return { passed, failed, total: _checklist.filter((i) => i.autoCheck).length };
}

export function getQaSummary(): {
  total: number;
  pass: number;
  fail: number;
  pending: number;
  byCategory: Record<QaCategory, { pass: number; fail: number; pending: number }>;
} {
  const categories: QaCategory[] = [
    'recommendation',
    'playback',
    'background',
    'persistence',
    'sharing',
    'onboarding',
  ];

  const byCategory = {} as Record<
    QaCategory,
    { pass: number; fail: number; pending: number }
  >;

  for (const cat of categories) {
    const catItems = _checklist.filter((c) => c.category === cat);
    byCategory[cat] = {
      pass: catItems.filter((c) => c.status === 'pass').length,
      fail: catItems.filter((c) => c.status === 'fail').length,
      pending: catItems.filter((c) => c.status === 'pending').length,
    };
  }

  return {
    total: _checklist.length,
    pass: _checklist.filter((c) => c.status === 'pass').length,
    fail: _checklist.filter((c) => c.status === 'fail').length,
    pending: _checklist.filter((c) => c.status === 'pending').length,
    byCategory,
  };
}

export const QA_CATEGORIES: QaCategory[] = [
  'recommendation',
  'playback',
  'background',
  'persistence',
  'sharing',
  'onboarding',
];
