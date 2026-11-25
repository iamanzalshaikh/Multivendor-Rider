import { memo, useCallback, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { dialog } from '@/lib/dialog';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { DeliveryProgressBar } from '@/components/DeliveryProgressBar';
import { OrderChatButton } from '@/components/OrderChatButton';
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
import { useEtaPicker } from '@/hooks/use-eta-picker';
import { useTheme } from '@/hooks/use-theme';
import { prefetchRiderOrder } from '@/hooks/queries/rider';
import { formatJmd, formatUsd, riderEarningForOrder } from '@/lib/money';
import {
  formatDeliveryAddress,
  formatPickupAddress,
  formatPickupNames,
  orderDisplayId,
  orderPickups,
} from '@/lib/orderDisplay';
import type { RiderOrder } from '@/types/rider';

type RiderCardAction =
  | 'processing'
  | 'on_the_way'
  | 'arrived'
  | 'complete'
  | 'reject'
  | 'pickup'
  | 'start';

type Props = {
  order: RiderOrder;
  busy: boolean;
  onAction: (
    action: RiderCardAction,
    opts?: { etaMinutes?: number },
  ) => boolean | void | Promise<boolean | void>;
};

export const ActiveOrderCard = memo(function ActiveOrderCard({ order, busy, onAction }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const pickups = orderPickups(order);
  const customer =
    typeof order.customerId === 'object' ? order.customerId?.fullName ?? 'Customer' : 'Customer';
  const customerPhone =
    typeof order.customerId === 'object' ? order.customerId?.mobile : undefined;
  const customerNote = String(order.generalNote || order.notes || '').trim();
  const next = nextRiderAction(order.orderStatus);
  const canReject =
    order.orderStatus === 'RIDER_ASSIGNED' ||
    order.orderStatus === 'PENDING' ||
    order.orderStatus === 'CONFIRMED' ||
    order.orderStatus === 'PREPARING' ||
    order.orderStatus === 'READY_FOR_PICKUP';
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
  const { pickEta, etaPickerModal } = useEtaPicker();

  const deferredFee = Boolean(
    (order as { deliveryFeeDeferred?: boolean }).deliveryFeeDeferred ||
      (order as { settlement?: { deliveryFeeDeferred?: boolean } }).settlement?.deliveryFeeDeferred,
  );

  const runPrimary = useCallback(async () => {
    if (!next) return;
    // COD / Get Anything: record fee+cash and wait for customer confirm ? never skip.
    if (next === 'complete' && (isCod || deferredFee)) {
      router.push(`/order/payment/${order._id}` as never);
      setSwipeKey((k) => k + 1);
      return;
    }
    if (next === 'on_the_way') {
      const eta = await pickEta();
      if (eta == null) {
        setSwipeKey((k) => k + 1);
        return;
      }
      const handled = await onAction(next, { etaMinutes: eta });
      if (handled === false) setSwipeKey((k) => k + 1);
      return;
    }
    const handled = await onAction(next);
    if (handled === false) {
      setSwipeKey((k) => k + 1);
    }
  }, [next, isCod, deferredFee, onAction, order._id, router, pickEta]);

  return (
    <Animated.View
      entering={FadeInDown.duration(280)}
      style={[styles.card, cardStyle, { backgroundColor: theme.backgroundElement }]}>
      {etaPickerModal}
      <View style={[styles.statusBar, { backgroundColor: theme.primarySoft }]}>
        <ThemedText style={[styles.statusText, { color: theme.primary }]}>
          {RIDER_STATUS_LABELS[order.orderStatus] ?? order.orderStatus}
        </ThemedText>
      </View>

      <View style={styles.top}>
        <ThemedText style={styles.orderId}>{orderDisplayId(order)}</ThemedText>
        <View style={styles.topActions}>
          <OrderChatButton orderId={order._id} compact enabled />
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
      </View>

      <View style={styles.progressWrap}>
        <DeliveryProgressBar status={order.orderStatus} />
      </View>

      <View style={styles.locations}>
        {pickups.length ? (
          pickups.map((pickup, index) => (
            <OrderLocationBlock
              key={pickup._id || `pickup-${index}`}
              type="pickup"
              title={
                pickups.length > 1
                  ? `Pickup ${index + 1} of ${pickups.length}`
                  : 'Pickup from'
              }
              name={pickup.restaurantName || formatPickupNames(order)}
              address={formatPickupAddress(pickup)}
              phone={pickup.phone}
            />
          ))
        ) : (
          <OrderLocationBlock
            type="pickup"
            title="Pickup from"
            name={formatPickupNames(order)}
            address="Restaurant address on file"
          />
        )}
        <OrderLocationBlock
          type="drop"
          title="Deliver to"
          name={customer}
          address={formatDeliveryAddress(order)}
          phone={customerPhone}
        />
      </View>

      {customerNote ? (
        <View style={[styles.noteBox, { backgroundColor: theme.primarySoft, marginHorizontal: Spacing.three }]}>
          <ThemedText type="label" style={{ color: theme.primary }}>
            Customer note
          </ThemedText>
          <ThemedText style={styles.noteText}>{customerNote}</ThemedText>
        </View>
      ) : null}

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
              dialog.alert('Release order?', 'This job goes back to the pool.', [
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
  orderId: { fontSize: 18, fontFamily: Fonts.extraBold, flex: 1, minWidth: 0, paddingRight: 8 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  noteBox: {
    marginTop: Spacing.two,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  noteText: { fontSize: 13, fontFamily: Fonts.medium, lineHeight: 18 },
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
