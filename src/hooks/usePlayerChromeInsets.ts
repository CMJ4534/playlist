import { useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MINI_PLAYER_HEIGHT, TAB_BAR_HEIGHT } from '@/constants/miniPlayer';
import { selectHasActiveQueue } from '@/stores/selectors/playerSelectors';
import { usePlayerStore } from '@/stores/playerStore';

export function usePlayerChromeInsets() {
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const showMini = usePlayerStore(selectHasActiveQueue);

  const isFullPlayer = segments[0] === 'player';
  const isTabRoute = segments[0] === '(tabs)';

  const visibleMini = showMini && !isFullPlayer;

  const tabBarInset = isTabRoute ? TAB_BAR_HEIGHT : 0;
  const miniPlayerBottom = tabBarInset + insets.bottom;
  const contentPaddingBottom = visibleMini
    ? tabBarInset + MINI_PLAYER_HEIGHT + insets.bottom
    : 0;

  return {
    showMini: visibleMini,
    miniPlayerBottom,
    contentPaddingBottom,
    isTabRoute,
  };
}
