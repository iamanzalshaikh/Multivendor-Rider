import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

import '@/tasks/riderLocationTask';
import { Brand } from '@/constants/theme';
import { queryClient } from '@/lib/queryClient';
import AppSplash from './splash';

SplashScreen.preventAutoHideAsync().catch(() => {});

const SPLASH_FALLBACK_MS = 800;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const [nativeSplashHidden, setNativeSplashHidden] = useState(false);

  const hideNativeSplash = useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
    } catch {
      try {
        await SplashScreen.hideAsync();
      } catch {
        // ignore
      }
    } finally {
      setNativeSplashHidden(true);
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void hideNativeSplash();
    }
  }, [fontsLoaded, fontError, hideNativeSplash]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void hideNativeSplash();
    }, SPLASH_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [hideNativeSplash]);

  const fontsReady = fontsLoaded || Boolean(fontError);

  // Paint our branded splash immediately — never a blank/white frame.
  if (!nativeSplashHidden || !fontsReady) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <AppSplash />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={DefaultTheme}>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'fade',
                animationDuration: 180,
                contentStyle: { backgroundColor: Brand.surface },
              }}
            />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
