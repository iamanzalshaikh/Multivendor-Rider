import { View, StyleSheet, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  type: 'pickup' | 'drop';
  title: string;
  name: string;
  address: string;
  phone?: string;
};

export function OrderLocationBlock({ type, title, name, address, phone }: Props) {
  const theme = useTheme();
  const isPickup = type === 'pickup';

  return (
    <View style={[styles.block, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: isPickup ? theme.primarySoft : theme.partnerSoft }]}>
          <Ionicons
            name={isPickup ? 'restaurant' : 'home'}
            size={18}
            color={isPickup ? theme.primary : theme.partner}
          />
        </View>
        <View style={styles.headerText}>
          <ThemedText type="label" themeColor="textSecondary">
            {title}
          </ThemedText>
          <ThemedText style={styles.name} numberOfLines={1}>
            {name}
          </ThemedText>
        </View>
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.address}>
        {address}
      </ThemedText>
      {phone ? (
        <Pressable onPress={() => Linking.openURL(`tel:${phone}`)} style={styles.phoneRow}>
          <Ionicons name="call-outline" size={14} color={theme.primary} />
          <ThemedText type="link" style={styles.phone}>
            {phone}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderWidth: 1,
    borderRadius: Layout.cardRadius,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontFamily: Fonts.bold, marginTop: 2 },
  address: { marginTop: Spacing.two, lineHeight: 20 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.two },
  phone: { fontSize: 14 },
});

type PickupSummaryProps = {
  title: string;
  names: string[];
  addresses: string[];
};

/** One compact card for multi-shop orders: all shop names on one flowing line. */
export function OrderPickupsSummaryBlock({ title, names, addresses }: PickupSummaryProps) {
  const theme = useTheme();
  const uniqueAddresses = [...new Set(addresses.filter(Boolean))];

  return (
    <View style={[styles.block, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="restaurant" size={18} color={theme.primary} />
        </View>
        <View style={styles.headerText}>
          <ThemedText type="label" themeColor="textSecondary">
            {title}
          </ThemedText>
          <ThemedText style={styles.name}>{names.join(' · ')}</ThemedText>
        </View>
      </View>
      {uniqueAddresses.length ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.address}>
          {uniqueAddresses.join(' · ')}
        </ThemedText>
      ) : null}
    </View>
  );
}
