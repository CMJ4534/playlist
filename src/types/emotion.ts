export type EmotionId =
  | 'sad'
  | 'dawn'
  | 'focus'
  | 'rain'
  | 'walk'
  | 'blank';

export type Emotion = {
  id: EmotionId;
  emoji: string;
  label: string;
  accent: string;
};
