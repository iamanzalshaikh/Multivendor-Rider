import 'react-native-gesture-handler';

import { DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
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
  const [splashHidden, setSplashHidden] = useState(false);

  const hideSplash = useCallback(async () => {
    try {
      await SplashScreen.hideAsync();
    } catch {
      // Retry once — dev client sometimes rejects the first hide call.
      try {
        await SplashScreen.hideAsync();
      } catch {
        // ignore
      }
    } finally {
      setSplashHidden(true);
    }
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void hideSplash();
    }
  }, [fontsLoaded, fontError, hideSplash]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void hideSplash();
    }, SPLASH_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [hideSplash]);

  const ready = splashHidden || fontsLoaded || Boolean(fontError);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.orange }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={DefaultTheme}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
              animationDuration: 120,
              contentStyle: { backgroundColor: Brand.surface },
            }}
          />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
