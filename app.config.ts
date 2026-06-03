import type { ExpoConfig } from 'expo/config';
import { config as loadEnv } from 'dotenv';
import path from 'path';

// app.config 평가 시 .env.development 로드 (extra.backendUrl에 반영)
loadEnv({ path: path.resolve(__dirname, '.env.development') });
loadEnv({ path: path.resolve(__dirname, '.env.local'), override: true });

const appEnv = process.env.APP_ENV ?? process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL?.trim();
const isProduction = appEnv === 'production';

const bundleId = 'com.moodplay.app';

const config: ExpoConfig = {
  name: isProduction ? 'Moodplay' : 'Moodplay Dev',
  owner: 'cmj4534',
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
    /** 개발 빌드·실기기에서 http://192.168.x.x:3001 API 허용 (Expo Go는 별도 정책) */
    usesCleartextTraffic: true,
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-web-browser',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    appEnv,
    backendUrl,
    recommendationSource: process.env.EXPO_PUBLIC_RECOMMENDATION_SOURCE,
    eas: {
      projectId: process.env.EAS_PROJECT_ID,
    },
  },
};

export default config;
