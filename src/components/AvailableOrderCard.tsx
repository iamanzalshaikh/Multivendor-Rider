import { memo, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { cardStyle, Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { prefetchRiderOrder } from '@/hooks/queries/rider';
import { useTheme } from '@/hooks/use-theme';
import {
  formatDeliveryAddress,
  formatRestaurantAddress,
  itemCount,
  orderDisplayId,
} from '@/lib/orderDisplay';
import { formatJmd, riderEarningForOrder } from '@/lib/money';
import type { RiderOrder } from '@/types/rider';

type Props = {
  order: RiderOrder;
  busy?: boolean;
  onAccept: () => void;
};

export const AvailableOrderCard = memo(function AvailableOrderCard({ order, busy, onAccept }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const restaurant =
    typeof order.restaurantId === 'object' ? order.restaurantId?.restaurantName ?? 'Restaurant' : 'Restaurant';
  const items = itemCount(order);

  const openDetails = useCallback(() => {
    router.push(`/order/${order._id}` as never);
  }, [order._id, router]);

  const prefetchDetails = useCallback(() => {
    prefetchRiderOrder(qc, order._id);
  }, [qc, order._id]);

  return (
    <View style={[styles.card, cardStyle, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ThemedText style={styles.orderId}>{orderDisplayId(order)}</ThemedText>
          <ThemedText style={styles.earnBadge}>
            Earn{' '}
            <ThemedText style={{ color: theme.partner, fontFamily: Fonts.extraBold }}>
              {formatJmd(riderEarningForOrder(order))}
            </ThemedText>
          </ThemedText>
        </View>
        <Pressable
          onPressIn={prefetchDetails}
          onPress={openDetails}
          hitSlop={8}
          style={[styles.viewBtn, { borderColor: theme.border }]}>
          <ThemedText type="link" style={styles.viewText}>
            Details
          </ThemedText>
          <Ionicons name="chevron-forward" size={12} color={theme.primary} />
        </Pressable>
      </View>

      <View style={styles.routeCompact}>
        <View style={styles.routeLine}>
          <Ionicons name="storefront-outline" size={14} color={theme.primary} />
          <ThemedText style={styles.routeName} numberOfLines={1}>
            {restaurant}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.routeAddr}>
          {formatRestaurantAddress(order)}
        </ThemedText>
        <View style={[styles.routeLine, { marginTop: 4 }]}>
          <Ionicons name="location-outline" size={14} color={theme.partner} />
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.routeDrop}>
            {formatDeliveryAddress(order)}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.footerRow, { borderTopColor: theme.border }]}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.metaLine}>
          {formatJmd(order.grandTotal)} · {items || '—'} items ·{' '}
          {order.paymentMethod === 'COD' ? 'COD' : 'Online'}
        </ThemedText>
        <Pressable
          onPress={onAccept}
          disabled={busy}
          style={[styles.acceptBtn, { backgroundColor: theme.partner, opacity: busy ? 0.7 : 1 }]}>
          <ThemedText style={styles.acceptText}>Accept</ThemedText>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { padding: Spacing.two + 2, marginBottom: Spacing.two },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flex: 1, minWidth: 0, paddingRight: Spacing.two },
  orderId: { fontSize: 15, fontFamily: Fonts.extraBold },
  earnBadge: { fontSize: 12, fontFamily: Fonts.medium, marginTop: 2 },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  viewText: { fontSize: 11 },
  routeCompact: { marginTop: Spacing.two },
  routeLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  routeName: { flex: 1, fontSize: 13, fontFamily: Fonts.bold },
  routeAddr: { marginLeft: 20, marginTop: 1 },
  routeDrop: { flex: 1 },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  metaLine: { flex: 1, minWidth: 0 },
  acceptBtn: {
    borderRadius: Layout.buttonRadius,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  acceptText: { color: '#fff', fontFamily: Fonts.extraBold, fontSize: 13 },
});
