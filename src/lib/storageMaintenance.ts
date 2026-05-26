/**
 * AsyncStorage 누적 방지 — 앱 시작 시 1회 trim.
 * store를 직접 import하지 않고, 외부에서 주입받는 구조.
 */

export const STORAGE_LIMITS = {
  maxPersistedQueueTracks: 40,
  maxPlaybackHealthEntries: 80,
  maxExposureCountEntries: 120,
  maxAnalyticsBufferEvents: 500,
} as const;

export type StorageMaintenanceReport = {
  ranAt: number;
  trimmed: string[];
};

type TrimTarget = {
  name: string;
  trim: () => boolean;
};

let registeredTargets: TrimTarget[] = [];

export function registerTrimTarget(target: TrimTarget) {
  registeredTargets.push(target);
}

export function runStorageMaintenance(): StorageMaintenanceReport {
  const trimmed: string[] = [];

  for (const target of registeredTargets) {
    try {
      if (target.trim()) trimmed.push(target.name);
    } catch {
      // trim 실패해도 앱은 계속 동작
    }
  }

  if (trimmed.length && typeof __DEV__ !== 'undefined' && __DEV__) {
    console.info('[storageMaintenance]', trimmed);
  }

  return { ranAt: Date.now(), trimmed };
}
