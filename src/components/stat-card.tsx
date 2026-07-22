import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { cardStyle } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string;
  value: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  accent?: 'primary' | 'partner' | 'warning' | 'default';
  wide?: boolean;
};

export function StatCard({ label, value, hint, icon, accent = 'default', wide }: Props) {
  const theme = useTheme();
  const accentColor =
    accent === 'primary' ? theme.primary : accent === 'partner' ? theme.partner : accent === 'warning' ? theme.warning : theme.text;
  const iconBg =
    accent === 'primary'
      ? theme.primarySoft
      : accent === 'partner'
        ? theme.partnerSoft
        : theme.backgroundSelected;

  return (
    <View
      style={[
        styles.card,
        cardStyle,
        { backgroundColor: theme.backgroundElement },
        wide ? styles.wide : styles.half,
      ]}>
      <View style={styles.top}>
        <ThemedText type="label" themeColor="textSecondary" style={styles.label}>
          {label}
        </ThemedText>
        {icon ? (
          <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
            <Ionicons name={icon} size={16} color={accentColor} />
          </View>
        ) : null}
      </View>
      <View>
        <ThemedText style={[styles.value, { color: accentColor }]} numberOfLines={1}>
          {value}
        </ThemedText>
        {hint ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            {hint}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  card: {
    padding: Spacing.three,
    minHeight: 100,
    justifyContent: 'space-between',
  },
  half: {
    width: '47.5%',
    flexGrow: 1,
  },
  wide: {
    width: '100%',
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.one,
  },
  label: {
    flex: 1,
    fontSize: 10,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 22,
    fontFamily: Fonts.extraBold,
    letterSpacing: -0.3,
    marginTop: Spacing.one,
  },
  hint: {
    marginTop: 2,
    fontSize: 11,
  },
});
