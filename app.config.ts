import type { ExpoConfig } from 'expo/config';

const appEnv = process.env.APP_ENV ?? process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
const isProduction = appEnv === 'production';

const bundleId = 'com.moodplay.app';

const config: ExpoConfig = {
  name: isProduction ? 'Moodplay' : 'Moodplay Dev',
  slug: 'moodplay',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'moodplay',
  userInterfaceStyle: 'dark',
  newArchEnabled: true,
  splash: {
    image: './assets/images/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0B0D14',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: bundleId,
  },
  android: {
    package: bundleId,
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#0B0D14',
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    appEnv,
    recommendationSource: process.env.EXPO_PUBLIC_RECOMMENDATION_SOURCE,
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
};

export default config;
