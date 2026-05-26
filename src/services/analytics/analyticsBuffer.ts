import type { AnalyticsEventName } from './analyticsEvents';
import type { AnalyticsEvent } from './types';

const DEFAULT_MAX = 500;

let buffer: AnalyticsEvent[] = [];
let maxSize = DEFAULT_MAX;

export function configureAnalyticsBuffer(max: number): void {
  maxSize = max;
}

export function pushAnalyticsEvent(event: AnalyticsEvent): void {
  buffer.push(event);
  if (buffer.length > maxSize) {
    buffer = buffer.slice(buffer.length - maxSize);
  }
}

export function getAnalyticsEvents(): readonly AnalyticsEvent[] {
  return buffer;
}

export function getAnalyticsEventsByName<E extends AnalyticsEventName>(
  name: E
): AnalyticsEvent<E>[] {
  return buffer.filter((e) => e.name === name) as AnalyticsEvent<E>[];
}

export function clearAnalyticsBuffer(): void {
  buffer = [];
}
