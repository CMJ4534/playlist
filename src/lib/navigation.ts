import type { Href } from 'expo-router';

/** Typed routes에 반영되기 전까지 공통 Href 헬퍼 */
export const LIBRARY_LIST_HREF = '/library' as Href;
export const FEED_TAB_HREF = '/(tabs)/feed' as Href;

export function libraryDetailHref(id: string): Href {
  return { pathname: '/library/[id]', params: { id } } as Href;
}

export function feedDetailHref(id: string): Href {
  return { pathname: '/feed/[id]', params: { id } } as Href;
}
