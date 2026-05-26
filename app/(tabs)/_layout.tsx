import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import React from 'react';

import { moodTheme } from '@/constants/moodTheme';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: moodTheme.bg },
        headerTintColor: moodTheme.text,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: moodTheme.bg,
          borderTopColor: moodTheme.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: moodTheme.primary,
        tabBarInactiveTintColor: moodTheme.textDim,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          headerTitle: 'Moodplay',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: '피드',
          headerTitle: '감성 피드',
          tabBarIcon: ({ color }) => <TabBarIcon name="th-large" color={color} />,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
