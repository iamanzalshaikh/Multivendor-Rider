import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors } from '@/constants/theme';

export type ThemePreference = 'light' | 'dark';
export type ActiveScheme = 'light' | 'dark';

type ThemeContextType = {
  themePreference: ThemePreference;
  activeScheme: ActiveScheme;
  colors: typeof Colors.light | typeof Colors.dark;
  isDark: boolean;
  setThemePreference: (pref: ThemePreference) => Promise<void>;
};

const STORAGE_KEY = '@sd_rider_theme_preference';

const ThemeContext = createContext<ThemeContextType>({
  themePreference: 'light',
  activeScheme: 'light',
  colors: Colors.light,
  isDark: false,
  setThemePreference: async () => {},
});

export function ThemeProviderCustom({ children }: { children: React.ReactNode }) {
  const deviceScheme = useDeviceColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('light');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark') {
          setThemePreferenceState(saved);
        } else {
          // First launch: follow device once, then persist as explicit preference.
          const resolved: ThemePreference = deviceScheme === 'dark' ? 'dark' : 'light';
          setThemePreferenceState(resolved);
          await AsyncStorage.setItem(STORAGE_KEY, resolved);
        }
      } catch (err) {
        console.error('Failed to load theme preference', err);
      } finally {
        setHydrated(true);
      }
    })();
    // Intentionally only on mount — device changes shouldn't override an explicit choice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setThemePreference = useCallback(async (pref: ThemePreference) => {
    setThemePreferenceState(pref);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, pref);
    } catch (err) {
      console.error('Failed to save theme preference', err);
    }
  }, []);

  const activeScheme: ActiveScheme = themePreference;

  useEffect(() => {
    if (!hydrated) return;
    // Never pass null — Android AppearanceModule.setColorScheme crashes on null.
    Appearance.setColorScheme(themePreference);
  }, [themePreference, hydrated]);

  const colors = Colors[activeScheme];
  const isDark = activeScheme === 'dark';

  const value = useMemo(
    () => ({
      themePreference,
      activeScheme,
      colors,
      isDark,
      setThemePreference,
    }),
    [themePreference, activeScheme, colors, isDark, setThemePreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext() {
  return useContext(ThemeContext);
}
