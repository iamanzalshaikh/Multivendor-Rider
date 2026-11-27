import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View, useColorScheme as useDeviceColorScheme } from 'react-native';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
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

import { Colors } from '@/constants/theme';
import { ThemeProviderCustom, useThemeContext } from '@/context/ThemeContext';
import { queryClient } from '@/lib/queryClient';
import { ToastHost } from '@/components/toast-host';
import { DialogHost } from '@/components/dialog-host';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { activeScheme, colors } = useThemeContext();

  return (
    <ThemeProvider value={activeScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 180,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
      <ToastHost />
      <DialogHost />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const deviceScheme = useDeviceColorScheme();
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  const fontsReady = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (fontsReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsReady]);

  // Match system light/dark while fonts load
  if (!fontsReady) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <View
          style={[
            styles.root,
            { backgroundColor: deviceScheme === 'dark' ? Colors.dark.background : Colors.light.background },
          ]}
        />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProviderCustom>
            <RootNavigator />
          </ThemeProviderCustom>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
