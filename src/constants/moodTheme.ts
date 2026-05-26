/** 감성 UX 공통 팔레트 · spacing · typography */
export const moodTheme = {
  bg: '#0B0D14',
  surface: '#151922',
  surfaceElevated: '#1E2433',
  border: '#2A3145',
  text: '#F4F6FB',
  textMuted: '#9AA3B8',
  textDim: '#6B758C',
  primary: '#8B7CFF',
  primaryPressed: '#6F5FE8',
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    screen: 20,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
  },
} as const;

export const moodTypography = {
  titleLarge: {
    fontSize: 28,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '800' as const,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
  },
} as const;
