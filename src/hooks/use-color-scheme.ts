import { useThemeContext } from '@/context/ThemeContext';

/** In-app light/dark preference (not device-only). */
export function useColorScheme(): 'light' | 'dark' {
  return useThemeContext().activeScheme;
}
