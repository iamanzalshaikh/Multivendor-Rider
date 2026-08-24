import { memo, useCallback, useState } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { DeliveryProgressBar } from '@/components/DeliveryProgressBar';
import { OrderLocationBlock } from '@/components/OrderLocationBlock';
import { SwipeToConfirm } from '@/components/SwipeToConfirm';
import { ThemedText } from '@/components/themed-text';
import {
  actionButtonLabel,
  nextRiderAction,
  RIDER_STATUS_LABELS,
} from '@/constants/deliveryStatus';
import { cardStyle, Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { prefetchRiderOrder } from '@/hooks/queries/rider';
import { formatJmd, formatUsd, riderEarningForOrder } from '@/lib/money';
import { formatDeliveryAddress, formatRestaurantAddress, orderDisplayId } from '@/lib/orderDisplay';
import type { RiderOrder } from '@/types/rider';

type Props = {
  order: RiderOrder;
  busy: boolean;
  onAction: (action: 'pickup' | 'start' | 'arrived' | 'complete' | 'reject') => boolean | void;
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
  const isBank = String(order.paymentMethod ?? '').toUpperCase() === 'BANK_TRANSFER';
  const isCod = String(order.paymentMethod ?? '').toUpperCase() === 'COD';
  const pay = String(order.paymentStatus ?? '').toUpperCase();
  const payInUsd = Boolean((order as { payInUsd?: boolean }).payInUsd);
  const totalUsd = (order as { totalUsd?: number | null }).totalUsd;

  const openDetails = useCallback(() => {
    router.push(`/order/${order._id}` as never);
  }, [order._id, router]);

  const prefetchDetails = useCallback(() => {
    prefetchRiderOrder(qc, order._id);
  }, [qc, order._id]);

  const [swipeKey, setSwipeKey] = useState(0);

  const runPrimary = useCallback(() => {
    if (!next) return;
    // COD must record cash + wait for customer confirm — never skip to completeDelivery.
    if (next === 'complete' && isCod) {
      router.push(`/order/payment/${order._id}` as never);
      setSwipeKey((k) => k + 1);
      return;
    }
    const handled = onAction(next);
    if (handled === false) {
      setSwipeKey((k) => k + 1);
    }
  }, [next, isCod, onAction, order._id, router]);

  return (
    <Animated.View
      entering={FadeInDown.duration(280)}
      style={[styles.card, cardStyle, { backgroundColor: theme.backgroundElement }]}>
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
        <DeliveryProgressBar status={order.orderStatus} />
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

      <View style={[styles.summarySection, { borderTopColor: theme.border }]}>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCell}>
            <ThemedText type="label" themeColor="textSecondary">
              Order value
            </ThemedText>
            {payInUsd && totalUsd != null ? (
              <>
                <ThemedText style={styles.amountJmd} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                  {formatJmd(order.grandTotal)}
                </ThemedText>
                <ThemedText style={[styles.amountUsd, { color: theme.primary }]} numberOfLines={1}>
                  {formatUsd(totalUsd)}
                </ThemedText>
              </>
            ) : (
              <ThemedText style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {formatJmd(order.grandTotal)}
              </ThemedText>
            )}
          </View>
          <View style={[styles.summaryCell, styles.summaryCellRight]}>
            <ThemedText type="label" themeColor="textSecondary">
              Delivery amount
            </ThemedText>
            <ThemedText
              style={[styles.amount, { color: theme.partner }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {formatJmd(riderEarningForOrder(order))}
            </ThemedText>
          </View>
        </View>
        {isCod ? (
          <View style={[styles.codBadge, { backgroundColor: theme.primarySoft }]}>
            <ThemedText style={[styles.codText, { color: theme.primary }]}>
              COD · Collect {payInUsd ? 'USD' : 'JMD'} cash
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.codBadge, { backgroundColor: theme.partnerSoft }]}>
            <ThemedText style={[styles.codText, { color: theme.partner }]}>
              {pay === 'COLLECTED' || pay === 'APPROVED'
                ? 'Bank · Settled'
                : 'Bank · Verify after delivery'}
            </ThemedText>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {canReject ? (
          <Pressable
            onPress={() =>
              Alert.alert('Release order?', 'This job goes back to the pool.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Release', style: 'destructive', onPress: () => onAction('reject') },
              ])
            }
            disabled={busy}
            style={[styles.secondaryBtn, { borderColor: theme.danger }]}>
            <ThemedText style={{ color: theme.danger, fontFamily: Fonts.bold, fontSize: 13 }}>
              Release
            </ThemedText>
          </Pressable>
        ) : null}
        {next ? (
          <View style={styles.swipeWrap}>
            <SwipeToConfirm
              key={`swipe-${swipeKey}`}
              label={actionButtonLabel(next, order)}
              busy={busy}
              disabled={busy}
              onConfirm={runPrimary}
            />
          </View>
        ) : null}
      </View>
    </Animated.View>
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
  progressWrap: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  locations: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, gap: Spacing.two },
  summarySection: {
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderTopWidth: 1,
    gap: Spacing.two,
  },
  summaryGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  summaryCell: { flex: 1, minWidth: 0 },
  summaryCellRight: { alignItems: 'flex-end' },
  amount: { fontSize: 16, fontFamily: Fonts.extraBold, marginTop: 2 },
  amountJmd: { fontSize: 14, fontFamily: Fonts.bold, marginTop: 2, color: '#586062' },
  amountUsd: { fontSize: 16, fontFamily: Fonts.extraBold, marginTop: 2 },
  codBadge: {
    alignSelf: 'stretch',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  codText: { fontSize: 10, fontFamily: Fonts.bold },
  actions: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  swipeWrap: {
    width: '100%',
  },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: Layout.buttonRadius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
});
