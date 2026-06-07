export type DiscoveryPressure = 'mainstream' | 'deep_cuts' | 'niche' | 'global';

const FALLBACK_PRESSURE: DiscoveryPressure = 'mainstream';

const PRESSURE_INSTRUCTIONS: Record<DiscoveryPressure, string> = {
  mainstream: `잘 알려진 곡 위주로 추천해.
스트리밍 수가 높고 많은 사람들이 아는 곡이어야 해.
아티스트 인지도가 높고, 한국 사용자에게 친숙한 곡을 우선해.`,

  deep_cuts: `유명 아티스트의 덜 알려진 곡 위주로 추천해.
히트곡보다 앨범 수록곡이나 B-side를 우선해.
스트리밍 수는 중간 수준이어도 괜찮아.`,

  niche: `잘 알려지지 않은 인디 또는 언더그라운드 아티스트 위주로 추천해.
사용자가 처음 들어볼 만한 발견의 느낌이 나야 해.`,

  global: `해외 아티스트 비중을 높여서 추천해.
한국어 곡보다 영어 또는 다른 언어 곡을 우선해.
다른 문화권 음악 탐색 관점에서 후보를 구성해.`,
};

export function resolveDiscoveryPressure(attemptCount: number): DiscoveryPressure {
  try {
    if (attemptCount <= 0) return 'mainstream';
    if (attemptCount === 1) return 'deep_cuts';
    if (attemptCount === 2) return 'niche';
    return 'global';
  } catch {
    return FALLBACK_PRESSURE;
  }
}

export function getDiscoveryPressureInstruction(pressure: DiscoveryPressure): string {
  return PRESSURE_INSTRUCTIONS[pressure] ?? PRESSURE_INSTRUCTIONS.mainstream;
}

/** YouTube search fallback — pressure별 3단계 쿼리 템플릿 */
export function buildYoutubeSearchQueries(
  pressure: DiscoveryPressure,
  title: string,
  artist: string
): string[] {
  const t = title.trim();
  const a = artist.trim();

  const queries: string[] = [];

  switch (pressure) {
    case 'mainstream':
      if (t && a) queries.push(`${t} ${a} official audio`);
      if (t && a) queries.push(`${t} ${a} topic`);
      if (t && a) queries.push(`${t} ${a}`);
      break;
    case 'deep_cuts':
      if (t && a) queries.push(`${t} ${a}`);
      if (t && a) queries.push(`${t} ${a} audio`);
      if (t) queries.push(t);
      break;
    case 'niche':
      if (t && a) queries.push(`${t} ${a}`);
      if (t) queries.push(`${t} audio`);
      if (t) queries.push(t);
      break;
    case 'global':
      if (t && a) queries.push(`${t} ${a}`);
      if (a) queries.push(`${a} topic`);
      if (a) queries.push(`${a} top songs`);
      break;
    default:
      if (t && a) queries.push(`${t} ${a} official audio`);
      if (t && a) queries.push(`${t} ${a} topic`);
      if (t && a) queries.push(`${t} ${a}`);
      break;
  }

  return queries;
}
