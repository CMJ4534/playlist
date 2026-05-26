import { Linking, Alert } from 'react-native';

/**
 * YouTube 앱 또는 웹으로 URL 열기.
 * 앱이 없으면 웹 브라우저로 fallback.
 */
export async function openYouTubeUrl(url: string): Promise<boolean> {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    }
    await Linking.openURL(url);
    return true;
  } catch {
    try {
      await Linking.openURL(url);
      return true;
    } catch {
      Alert.alert('YouTube를 열 수 없습니다', '브라우저에서 직접 열어주세요.');
      return false;
    }
  }
}

export async function openYouTubeVideo(videoId: string): Promise<boolean> {
  const appUrl = `youtube://www.youtube.com/watch?v=${videoId}`;
  const webUrl = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    const canOpenApp = await Linking.canOpenURL(appUrl).catch(() => false);
    if (canOpenApp) {
      await Linking.openURL(appUrl);
      return true;
    }
  } catch { /* fall through to web */ }

  return openYouTubeUrl(webUrl);
}

