import { View, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { Layout } from '@/constants/layout';
import { Spacing, Brand, Fonts } from '@/constants/theme';

type MetaItem = { value: string; label: string };

type Props = {
  todayAmount: number;
  meta: [MetaItem, MetaItem, MetaItem];
  icon?: keyof typeof Ionicons.glyphMap;
  footer?: ReactNode;
};

/** Orange earnings hero — uses plain Text so ThemedText lineHeight does not clip large amounts. */
export function EarningsHeroCard({ todayAmount, meta, icon = 'wallet', footer }: Props) {
  return (
    <LinearGradient
      colors={[Brand.orange, '#ff7a33']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroCard}>
      <View style={styles.heroTop}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroLabel}>Today&apos;s earnings</Text>
          <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            ₹{todayAmount}
          </Text>
        </View>
        <View style={styles.heroIconWrap}>
          <Ionicons name={icon} size={28} color="#fff" />
        </View>
      </View>
      <View style={styles.heroDivider} />
      <View style={styles.heroMetaRow}>
        <View style={styles.heroMetaItem}>
          <Text style={styles.heroMetaValue} numberOfLines={1}>
            {meta[0].value}
          </Text>
          <Text style={styles.heroMetaLabel}>{meta[0].label}</Text>
        </View>
        <View style={styles.heroMetaDivider} />
        <View style={styles.heroMetaItem}>
          <Text style={styles.heroMetaValue} numberOfLines={1}>
            {meta[1].value}
          </Text>
          <Text style={styles.heroMetaLabel}>{meta[1].label}</Text>
        </View>
        <View style={styles.heroMetaDivider} />
        <View style={styles.heroMetaItem}>
          <Text style={styles.heroMetaValue} numberOfLines={1}>
            {meta[2].value}
          </Text>
          <Text style={styles.heroMetaLabel}>{meta[2].label}</Text>
        </View>
      </View>
      {footer}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: Layout.cardRadius,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  heroLeft: {
    flex: 1,
    minWidth: 0,
    paddingRight: Spacing.one,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Fonts.medium,
  },
  heroAmount: {
    color: '#fff',
    fontSize: 32,
    lineHeight: 40,
    fontFamily: Fonts.extraBold,
    marginTop: 6,
    letterSpacing: -0.5,
  },
  heroIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: Spacing.three,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroMetaItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  heroMetaDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroMetaValue: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.extraBold,
    textAlign: 'center',
  },
  heroMetaLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    lineHeight: 14,
    fontFamily: Fonts.medium,
    marginTop: 4,
    textAlign: 'center',
  },
});
