import { Platform } from 'react-native';

/** Shared SD Services design tokens — aligned with customer app + restaurant portal */
export const Colors = {
  light: {
    text: '#1a1c1c',
    background: '#f9f9f9',
    backgroundElement: '#ffffff',
    backgroundSelected: '#f3f3f3',
    textSecondary: '#586062',
    primary: '#ff5a00',
    primarySoft: 'rgba(255, 90, 0, 0.08)',
    primaryDark: '#d44a00',
    /** Partner-only accent: online status, earnings highlight */
    partner: '#22c55e',
    partnerSoft: 'rgba(34, 197, 94, 0.12)',
    danger: '#ef4444',
    dangerSoft: 'rgba(239, 68, 68, 0.12)',
    warning: '#f59e0b',
    warningSoft: 'rgba(245, 158, 11, 0.12)',
    border: '#e4e4e7',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    primary: '#ff5a00',
    primarySoft: 'rgba(255, 90, 0, 0.15)',
    primaryDark: '#ff7c33',
    partner: '#22c55e',
    partnerSoft: 'rgba(34, 197, 94, 0.18)',
    danger: '#f87171',
    dangerSoft: 'rgba(248, 113, 113, 0.18)',
    warning: '#fbbf24',
    warningSoft: 'rgba(251, 191, 36, 0.18)',
    border: '#2E3135',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;

export const Brand = {
  orange: '#ff5a00',
  orangeDark: '#d44a00',
  surface: '#f9f9f9',
  ink: '#1a1c1c',
} as const;
