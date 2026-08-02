import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { cardStyle } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  noPadding?: boolean;
};

export function SectionCard({ title, subtitle, action, children, noPadding }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          {subtitle ? (
            <ThemedText type="small" themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        {action}
      </View>
      <View style={[styles.body, cardStyle, { backgroundColor: theme.backgroundElement }, noPadding && styles.bodyFlush]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: Spacing.three,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
    gap: Spacing.two,
  },
  headText: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 15,
    fontFamily: Fonts.extraBold,
  },
  body: {
    overflow: 'hidden',
    padding: Spacing.three,
  },
  bodyFlush: {
    padding: 0,
  },
});
