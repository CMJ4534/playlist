import React, { useCallback } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';

import { moodTheme, moodTypography } from '@/constants/moodTheme';
import { usePublicFeedStore } from '@/stores/publicFeedStore';
import { FeedCard } from '@/components/feed/FeedCard';
import { FeedFilterBar } from '@/components/feed/FeedFilterBar';
import type { PublicPlaylist, FeedFilter } from '@/types/publicPlaylist';

export default function FeedScreen() {
  const router = useRouter();
  const filter = usePublicFeedStore((s) => s.filter);
  const setFilter = usePublicFeedStore((s) => s.setFilter);
  const getFiltered = usePublicFeedStore((s) => s.getFiltered);
  const toggleLike = usePublicFeedStore((s) => s.toggleLike);
  const isLiked = usePublicFeedStore((s) => s.isLiked);

  const playlists = getFiltered();

  const handlePress = useCallback(
    (id: string) => {
      router.push({ pathname: '/feed/[id]', params: { id } } as Href);
    },
    [router]
  );

  const handleFilterChange = useCallback(
    (f: FeedFilter) => setFilter(f),
    [setFilter]
  );

  const renderItem = useCallback(
    ({ item }: { item: PublicPlaylist }) => (
      <FeedCard
        playlist={item}
        isLiked={isLiked(item.id)}
        onPress={() => handlePress(item.id)}
        onLike={() => toggleLike(item.id)}
      />
    ),
    [isLiked, handlePress, toggleLike]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <FeedFilterBar active={filter} onChange={handleFilterChange} />
      <FlatList
        data={playlists}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🎵</Text>
            <Text style={styles.emptyText}>
              아직 공개된 플레이리스트가 없어요
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: moodTheme.bg },
  list: {
    paddingHorizontal: moodTheme.spacing.screen,
    paddingBottom: 120,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyEmoji: { fontSize: 48, marginBottom: moodTheme.spacing.md },
  emptyText: {
    ...moodTypography.body,
    color: moodTheme.textDim,
  },
});
