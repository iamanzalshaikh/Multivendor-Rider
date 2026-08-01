import { memo, useCallback } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { DeliveryProgressBar } from '@/components/DeliveryProgressBar';
import { OrderLocationBlock } from '@/components/OrderLocationBlock';
import { ThemedText } from '@/components/themed-text';
import { actionButtonLabel, nextRiderAction, RIDER_STATUS_LABELS } from '@/constants/deliveryStatus';
import { cardStyle, Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { prefetchRiderOrder } from '@/hooks/queries/rider';
import { formatJmd, riderEarningForOrder } from '@/lib/money';
import { formatDeliveryAddress, formatRestaurantAddress, orderDisplayId } from '@/lib/orderDisplay';
import type { RiderOrder } from '@/types/rider';

type Props = {
  order: RiderOrder;
  busy: boolean;
  onAction: (action: 'pickup' | 'start' | 'arrived' | 'complete' | 'reject') => void;
};

export const ActiveOrderCard = memo(function ActiveOrderCard({ order, busy, onAction }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const restaurant =
    typeof order.restaurantId === 'object' ? order.restaurantId?.restaurantName ?? 'Restaurant' : 'Restaurant';
  const restaurantPhone =
    typeof order.restaurantId === 'object'
      ? (order.restaurantId as { phone?: string })?.phone
      : undefined;
  const customer =
    typeof order.customerId === 'object' ? order.customerId?.fullName ?? 'Customer' : 'Customer';
  const customerPhone =
    typeof order.customerId === 'object' ? order.customerId?.mobile : undefined;
  const next = nextRiderAction(order.orderStatus);
  const canReject = order.orderStatus === 'RIDER_ASSIGNED';

  const openDetails = useCallback(() => {
    router.push(`/order/${order._id}` as never);
  }, [order._id, router]);

  const prefetchDetails = useCallback(() => {
    prefetchRiderOrder(qc, order._id);
  }, [qc, order._id]);

  return (
    <View style={[styles.card, cardStyle, { backgroundColor: theme.backgroundElement }]}>
      <View style={[styles.statusBar, { backgroundColor: theme.primarySoft }]}>
        <ThemedText style={[styles.statusText, { color: theme.primary }]}>
          {RIDER_STATUS_LABELS[order.orderStatus] ?? order.orderStatus}
        </ThemedText>
      </View>

      <View style={styles.top}>
        <ThemedText style={styles.orderId}>{orderDisplayId(order)}</ThemedText>
        <Pressable
          onPressIn={prefetchDetails}
          onPress={openDetails}
          style={[styles.detailsBtn, { borderColor: theme.border }]}>
          <ThemedText type="link" style={styles.detailsText}>
            Details
          </ThemedText>
          <Ionicons name="chevron-forward" size={14} color={theme.primary} />
        </Pressable>
      </View>

      <View style={styles.progressWrap}>
        <DeliveryProgressBar status={order.orderStatus} compact />
      </View>

      <View style={styles.locations}>
        <OrderLocationBlock
          type="pickup"
          title="Pickup from"
          name={restaurant}
          address={formatRestaurantAddress(order)}
          phone={restaurantPhone}
        />
        <OrderLocationBlock
          type="drop"
          title="Deliver to"
          name={customer}
          address={formatDeliveryAddress(order)}
          phone={customerPhone}
        />
      </View>

      <View style={[styles.summaryRow, { borderTopColor: theme.border }]}>
        <View>
          <ThemedText type="label" themeColor="textSecondary">
            Order value
          </ThemedText>
          <ThemedText style={styles.amount}>{formatJmd(order.grandTotal)}</ThemedText>
        </View>
        <View>
          <ThemedText type="label" themeColor="textSecondary">
            You earn
          </ThemedText>
          <ThemedText style={[styles.amount, { color: theme.partner }]}>
            {formatJmd(riderEarningForOrder(order))}
          </ThemedText>
        </View>
        {order.paymentMethod === 'COD' ? (
          <View style={[styles.codBadge, { backgroundColor: theme.primarySoft }]}>
            <ThemedText style={[styles.codText, { color: theme.primary }]}>COD · Collect cash</ThemedText>
          </View>
        ) : (
          <View style={[styles.codBadge, { backgroundColor: theme.partnerSoft }]}>
            <ThemedText style={[styles.codText, { color: theme.partner }]}>Prepaid</ThemedText>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {canReject ? (
          <Pressable
            onPress={() => onAction('reject')}
            disabled={busy}
            style={[styles.secondaryBtn, { borderColor: theme.danger }]}>
            <ThemedText style={{ color: theme.danger, fontFamily: Fonts.bold, fontSize: 13 }}>
              Release
            </ThemedText>
          </Pressable>
        ) : null}
        {next ? (
          <Pressable
            onPress={() => onAction(next)}
            disabled={busy}
            style={[
              styles.primaryBtn,
              { backgroundColor: theme.primary, flex: 1, opacity: busy ? 0.7 : 1 },
            ]}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.primaryBtnText}>{actionButtonLabel(next)}</ThemedText>
            )}
          </Pressable>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { overflow: 'hidden', marginBottom: Spacing.two },
  statusBar: { paddingVertical: 10, paddingHorizontal: Spacing.three, alignItems: 'center' },
  statusText: { fontSize: 11, fontFamily: Fonts.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  orderId: { fontSize: 18, fontFamily: Fonts.extraBold },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  detailsText: { fontSize: 12 },
  progressWrap: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  locations: { paddingHorizontal: Spacing.three },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    borderTopWidth: 1,
  },
  amount: { fontSize: 20, fontFamily: Fonts.extraBold, marginTop: 2 },
  codBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  codText: { fontSize: 11, fontFamily: Fonts.bold },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  primaryBtn: { borderRadius: Layout.buttonRadius, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: {
    color: '#fff',
    fontFamily: Fonts.extraBold,
    fontSize: 14,
    textAlign: 'center',
  },
  secondaryBtn: {
    borderRadius: Layout.buttonRadius,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
});
