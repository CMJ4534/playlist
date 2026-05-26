import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { usePlayerChromeInsets } from '@/hooks/usePlayerChromeInsets';

import { PlaylistQualityPrompt } from '@/components/feedback/PlaylistQualityPrompt';
import { ToastHost } from '@/components/ui/ToastHost';

import { HiddenYoutubePlayer } from './HiddenYoutubePlayer';
import { MiniPlayerBar } from './MiniPlayerBar';
import { PlaybackDebugOverlay } from './PlaybackDebugOverlay';

type Props = {
  children: ReactNode;
};

/**
 * Root 레이아웃용 플레이어 셸.
 * Stack 콘텐츠 + MiniPlayer(탭 위 고정) + HiddenYoutubePlayer를 한곳에서 관리한다.
 */
export function GlobalPlayerChrome({ children }: Props) {
  const { showMini, miniPlayerBottom, contentPaddingBottom } = usePlayerChromeInsets();

  return (
    <View style={styles.root}>
      <View style={[styles.content, { paddingBottom: contentPaddingBottom }]}>
        {children}
      </View>

      {showMini ? (
        <View style={[styles.miniAnchor, { bottom: miniPlayerBottom }]}>
          <MiniPlayerBar />
        </View>
      ) : null}

      <HiddenYoutubePlayer />
      <PlaylistQualityPrompt />
      <ToastHost />
      <PlaybackDebugOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  miniAnchor: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});
