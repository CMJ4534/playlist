import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { OnboardingGate } from '@/components/onboarding/OnboardingGate';
import { ToastHost } from '@/components/ui/ToastHost';
import { useColorScheme } from '@/components/useColorScheme';
import { moodTheme } from '@/constants/moodTheme';
import { AppProviders } from '@/providers/AppProviders';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <AppProviders>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <OnboardingGate>
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: moodTheme.bg },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="emotion/index" options={{ headerShown: false }} />
            <Stack.Screen name="recommendation/index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding/index" options={{ headerShown: false }} />
            <Stack.Screen name="settings/index" options={{ headerShown: false }} />
            <Stack.Screen name="dev/index" options={{ headerShown: false }} />
            <Stack.Screen name="library/index" options={{ headerShown: false }} />
            <Stack.Screen name="library/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="feed/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="player/index" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
          <ToastHost />
        </OnboardingGate>
      </ThemeProvider>
    </AppProviders>
  );
}
