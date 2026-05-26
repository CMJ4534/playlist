import { EMOTIONS } from '@/constants/emotions';
import { buildAnalyzedUserTasteProfile } from '@/lib/userTasteProfile';
import type { EmotionId } from '@/types/emotion';

export type HomeGreeting = {
  headline: string;
  subline: string;
};

export function getHomeGreeting(): HomeGreeting {
  const hour = new Date().getHours();
  const taste = buildAnalyzedUserTasteProfile();
  const topEmotion = taste.frequentEmotionIds[0];
  const topLabel = topEmotion ?
    EMOTIONS.find((e) => e.id === topEmotion)?.label
  : null;

  if (hour >= 0 && hour < 6) {
    return {
      headline: '아직 깨어 있는 밤이네요',
      subline: topLabel ?
        `요즘 자주 찾는 ${topLabel} 무드, 오늘도 이어가 볼까요?`
      : '새벽감성이나 조용한 멜로디가 잘 어울려요',
    };
  }
  if (hour >= 6 && hour < 12) {
    return {
      headline: '좋은 아침이에요',
      subline: '오늘 하루의 첫 음악을 골라볼까요?',
    };
  }
  if (hour >= 12 && hour < 18) {
    return {
      headline: '오후의 리듬',
      subline: topLabel ?
        `${topLabel} 무드가 요즘 당신에게 잘 맞았어요`
      : '집중이 필요하면 불꽃, 쉬고 싶으면 비 오는 날',
    };
  }
  if (hour >= 18 && hour < 22) {
    return {
      headline: '저녁이 내려앉는 시간',
      subline: '산책하거나, 창밖을 보며 천천히 들어보세요',
    };
  }
  return {
    headline: '오늘도 수고했어요',
    subline: topLabel ?
      `밤에는 ${topLabel} 플레이리스트가 자주 찾아지더라고요`
    : '잔잔한 멜로디로 하루를 마무리해요',
  };
}

export function getTodayEmotionCopy(emotionId: EmotionId): string {
  const emotion = EMOTIONS.find((e) => e.id === emotionId);
  const label = emotion?.label ?? '오늘';
  const copies: Record<EmotionId, string> = {
    sad: `${label} 무드로 마음을 낮춰볼까요?`,
    dawn: `지금 시간엔 ${label}이 특히 잘 어울려요`,
    focus: `깊이 몰입할 ${label} 플레이리스트`,
    rain: `비 오는 날처럼 스며드는 ${label}`,
    walk: `발걸음에 맞춘 ${label} 선곡`,
    blank: `아무 생각 없이 ${label}으로 쉬어가요`,
  };
  return copies[emotionId] ?? `${label}으로 시작해보세요`;
}
