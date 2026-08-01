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
          <Ionicons name="chevron-forward" size={14} color={theme.primary} />
        </Pressable>
      </View>

      <View style={[styles.routeRow, { backgroundColor: theme.background }]}>
        <View style={styles.routePoint}>
          <View style={[styles.dot, { backgroundColor: theme.primary }]} />
          <View style={styles.routeText}>
            <ThemedText type="label" themeColor="textSecondary">
              Pickup
            </ThemedText>
            <ThemedText style={styles.routeName} numberOfLines={1}>
              {restaurant}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {formatRestaurantAddress(order)}
            </ThemedText>
          </View>
        </View>
        <View style={[styles.routeLine, { backgroundColor: theme.border }]} />
        <View style={styles.routePoint}>
          <View style={[styles.dot, { backgroundColor: theme.partner }]} />
          <View style={styles.routeText}>
            <ThemedText type="label" themeColor="textSecondary">
              Drop
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {formatDeliveryAddress(order)}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={[styles.meta, { borderTopColor: theme.border }]}>
        <View style={styles.metaCell}>
          <ThemedText type="label" themeColor="textSecondary">
            Order
          </ThemedText>
          <ThemedText style={styles.metaVal}>{formatJmd(order.grandTotal)}</ThemedText>
        </View>
        <View style={styles.metaCell}>
          <ThemedText type="label" themeColor="textSecondary">
            Items
          </ThemedText>
          <ThemedText style={styles.metaVal}>{items || '—'}</ThemedText>
        </View>
        <View style={styles.metaCell}>
          <ThemedText type="label" themeColor="textSecondary">
            Payment
          </ThemedText>
          <ThemedText style={styles.metaVal}>{order.paymentMethod === 'COD' ? 'COD' : 'Online'}</ThemedText>
        </View>
      </View>

      <Pressable
        onPress={onAccept}
        disabled={busy}
        style={[styles.acceptBtn, { backgroundColor: theme.partner, opacity: busy ? 0.7 : 1 }]}>
        <ThemedText style={styles.acceptText}>Accept delivery</ThemedText>
    </Pressable>
  </View>
  );
});

const styles = StyleSheet.create({
  card: { padding: Spacing.three, marginBottom: Spacing.two },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1 },
  orderId: { fontSize: 17, fontFamily: Fonts.extraBold },
  earnBadge: { fontSize: 13, fontFamily: Fonts.medium, marginTop: 4 },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  viewText: { fontSize: 12 },
  routeRow: { marginTop: Spacing.three, borderRadius: Layout.inputRadius, padding: Spacing.two },
  routePoint: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  routeText: { flex: 1, minWidth: 0 },
  routeName: { fontSize: 14, fontFamily: Fonts.bold, marginTop: 2 },
  routeLine: { width: 2, height: 16, marginLeft: 4, marginVertical: 4 },
  meta: {
    flexDirection: 'row',
    marginTop: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
  },
  metaCell: { flex: 1 },
  metaVal: { fontSize: 14, fontFamily: Fonts.extraBold, marginTop: 2 },
  acceptBtn: {
    marginTop: Spacing.three,
    borderRadius: Layout.buttonRadius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  acceptText: { color: '#fff', fontFamily: Fonts.extraBold, fontSize: 15 },
});
