import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { dialog } from '@/lib/dialog';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { DeliveryProgressBar } from '@/components/DeliveryProgressBar';
import { OrderChatButton } from '@/components/OrderChatButton';
import { OrderLocationBlock, OrderPickupsSummaryBlock } from '@/components/OrderLocationBlock';
import { GetAnythingAmountsCard } from '@/components/GetAnythingAmountsCard';
import { PurchaseAmountModal, type PurchaseLine } from '@/components/PurchaseAmountModal';
import type { RiderOrderItem } from '@/types/rider';
import { SwipeToConfirm } from '@/components/SwipeToConfirm';
import { ThemedText } from '@/components/themed-text';
import {
  actionButtonLabel,
  canReportOutOfStock,
  isClaimableOrder,
  nextRiderAction,
  RIDER_STATUS_LABELS,
} from '@/constants/deliveryStatus';
import { cardStyle, Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useOrderLocationPing } from '@/hooks/use-order-location-ping';
import {
  formatDeliveryAddress,
  formatPickupAddress,
  formatPickupNames,
  itemCount,
  canEnterPurchaseAmount,
  getAnythingItems,
  isGetAnythingOrder,
  orderDisplayId,
  orderPickups,
} from '@/lib/orderDisplay';
import { useRiderOrderQuery } from '@/hooks/queries/rider';
import {
  invalidateAfterDeliveryComplete,
  invalidateAfterOrderAction,
} from '@/lib/riderQueryInvalidation';
import {
  optimisticStatusForAction,
  patchOrderStatusOptimistic,
} from '@/lib/optimisticOrderStatus';
import {
  acceptOrder,
  completeDelivery,
  markArrived,
  markItemsPurchased,
  rejectOrder,
  reportItemsOutOfStock,
  setPurchasedPrices,
  startOnTheWay,
} from '@/services/riders';
import { formatCashDue, formatJmd, formatOrderTotal, riderEarningForOrder } from '@/lib/money';
import { riderKeys } from '@/hooks/queries/keys';
import { DEFAULT_ETA_MINUTES } from '@/constants/deliveryStatus';
import { useEtaPicker } from '@/hooks/use-eta-picker';

function resolveOrderId(raw: string | string[] | undefined): string | undefined {
  if (!raw) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

/** Custom (Get Anything) lines that still need the rider's actual purchase amount. */
function getAnythingLines(order: { items?: RiderOrderItem[]; orderItems?: RiderOrderItem[]; settlement?: unknown } | undefined): PurchaseLine[] {
  if (!order) return [];
  return getAnythingItems(order)
    .map((i) => ({
      itemId: String(i.id ?? i._id ?? ''),
      name: i.itemName,
      quantity: i.quantity,
      estimate: Number(i.price ?? 0) * Number(i.quantity || 1),
    }))
    .filter((l) => l.itemId);
}

export default function OrderDetailScreen() {
  const params = useLocalSearchParams<{ orderId: string }>();
  const orderId = resolveOrderId(params.orderId);
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const [swipeKey, setSwipeKey] = useState(0);
  const { pickEta, etaPickerModal } = useEtaPicker();
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [purchaseSaving, setPurchaseSaving] = useState(false);

  const orderQ = useRiderOrderQuery(orderId);
  const [selectedOosIds, setSelectedOosIds] = useState<string[]>([]);

  useOrderLocationPing(orderQ.data?.orderStatus);

  const oosMut = useMutation({
    mutationFn: async () => {
      if (!orderId) throw new Error('Missing order');
      if (!selectedOosIds.length) throw new Error('Select at least one item');
      return reportItemsOutOfStock(orderId, selectedOosIds, 'Out of stock');
    },
    onSuccess: () => {
      setSelectedOosIds([]);
      if (orderId) invalidateAfterOrderAction(qc, orderId);
      dialog.alert(
        'Customer notified',
        'The customer was told these items are out of stock. You are released from this delivery — they can cancel and place a new order.',
      );
      router.replace('/(tabs)/orders');
    },
    onError: (e) => {
      dialog.alert('Failed', e instanceof Error ? e.message : 'Try again');
    },
  });

  const actionMut = useMutation({
    mutationFn: async (payload: {
      action:
        | 'accept'
        | 'processing'
        | 'on_the_way'
        | 'arrived'
        | 'complete'
        | 'reject'
        | 'pickup'
        | 'start';
      etaMinutes?: number;
    }) => {
      if (!orderId) throw new Error('Missing order');
      const { action, etaMinutes } = payload;
      if (action === 'accept') return acceptOrder(orderId);
      if (action === 'processing' || action === 'pickup') return markItemsPurchased(orderId);
      if (action === 'on_the_way' || action === 'start') {
        return startOnTheWay(orderId, etaMinutes ?? DEFAULT_ETA_MINUTES);
      }
      if (action === 'arrived') return markArrived(orderId);
      if (action === 'complete') return completeDelivery(orderId);
      return rejectOrder(orderId);
    },
    onMutate: async ({ action }) => {
      if (!orderId) return;
      const nextStatus = optimisticStatusForAction(action);
      if (!nextStatus) return;
      await qc.cancelQueries({ queryKey: riderKeys.order(orderId) });
      const prev = patchOrderStatusOptimistic(qc, orderId, nextStatus);
      return { prev };
    },
    onError: (e, _vars, ctx) => {
      if (orderId && ctx?.prev) {
        qc.setQueryData(riderKeys.order(orderId), ctx.prev);
      }
      dialog.alert('Failed', e instanceof Error ? e.message : 'Try again');
    },
    onSuccess: (_, { action }) => {
      if (!orderId) return;
      if (action === 'complete') {
        invalidateAfterDeliveryComplete(qc, orderId);
      } else {
        invalidateAfterOrderAction(qc, orderId);
      }
      if (action === 'accept' || action === 'complete' || action === 'reject') {
        router.replace('/(tabs)/orders');
      }
    },
  });

  async function runRiderAction(
    action:
      | 'accept'
      | 'processing'
      | 'on_the_way'
      | 'arrived'
      | 'complete'
      | 'reject'
      | 'pickup'
      | 'start',
  ) {
    // Get Anything: the customer's amount was an estimate — record what was really paid first.
    if (action === 'processing' && getAnythingLines(order).length) {
      setPurchaseOpen(true);
      return;
    }
    if (action === 'on_the_way' || action === 'start') {
      const eta = await pickEta();
      if (eta == null) {
        setSwipeKey((k) => k + 1);
        return;
      }
      actionMut.mutate({ action: 'on_the_way', etaMinutes: eta });
      return;
    }
    actionMut.mutate({ action });
  }

  if (!orderId) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <ThemedText>Invalid order link</ThemedText>
        <Pressable onPress={() => router.back()}>
          <ThemedText type="link" style={{ marginTop: Spacing.two }}>
            Go back
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (orderQ.isLoading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (orderQ.isError || !orderQ.data) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <Ionicons name="alert-circle-outline" size={40} color={theme.danger} />
        <ThemedText style={styles.errorTitle}>Could not load order</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.errorSub}>
          {orderQ.error instanceof Error ? orderQ.error.message : 'Try again'}
        </ThemedText>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: theme.border }]}>
          <ThemedText type="link">Go back</ThemedText>
        </Pressable>
      </SafeAreaView>
    );
  }

  const order = orderQ.data;
  const pickups = orderPickups(order);
  const customer = typeof order.customerId === 'object' ? order.customerId : undefined;
  const isAvailable = isClaimableOrder(order);
  const next = isAvailable ? null : nextRiderAction(order.orderStatus);
  const pay = String(order.paymentStatus ?? '').toUpperCase();
  const items = order.items ?? order.orderItems ?? [];
  const count = itemCount(order);
  const customerNote = String(order.generalNote || order.notes || '').trim();
  const chatEnabled = Boolean(order.riderId) || !isAvailable;
  const showOosReport = canReportOutOfStock(order);
  const awaitingCustomer =
    order.orderStatus === 'PARTIAL_PENDING_CUSTOMER' || Boolean(order.awaitingCustomerDecision);

  function toggleOosItem(id: string) {
    setSelectedOosIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function confirmReportOos() {
    if (!selectedOosIds.length) {
      dialog.alert('Select items', 'Tap the items that ran out of stock, then report.');
      return;
    }
    const names = items
      .filter((it) => {
        const id = String(it.id ?? it._id ?? '');
        return id && selectedOosIds.includes(id);
      })
      .map((it) => it.itemName)
      .join(', ');
    dialog.alert(
      'Report out of stock?',
      `Tell the customer that ${names || 'selected items'} ran out of stock. They can cancel and place a new order.`,
      [
        { text: 'Back', style: 'cancel' },
        {
          text: 'Notify customer',
          style: 'destructive',
          onPress: () => oosMut.mutate(),
        },
      ],
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      {etaPickerModal}
      <Modal visible={Boolean(photoPreview)} transparent animationType="fade" onRequestClose={() => setPhotoPreview(null)}>
        <Pressable style={styles.photoOverlay} onPress={() => setPhotoPreview(null)}>
          {photoPreview ? (
            <Image source={{ uri: photoPreview }} style={styles.photoFull} resizeMode="contain" />
          ) : null}
          <Pressable style={styles.photoClose} onPress={() => setPhotoPreview(null)} hitSlop={12}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>
      <PurchaseAmountModal
        visible={purchaseOpen}
        lines={getAnythingLines(order)}
        busy={purchaseSaving}
        onCancel={() => setPurchaseOpen(false)}
        onConfirm={async (prices) => {
          setPurchaseSaving(true);
          try {
            await setPurchasedPrices(orderId!, prices);
            setPurchaseOpen(false);
            actionMut.mutate({ action: 'processing' });
          } catch (e) {
            dialog.alert('Could not save amount', e instanceof Error ? e.message : 'Try again');
          } finally {
            setPurchaseSaving(false);
          }
        }}
      />
      <View style={[styles.nav, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.navBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.navCenter}>
          <ThemedText style={styles.navTitle}>{orderDisplayId(order)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {RIDER_STATUS_LABELS[order.orderStatus] ?? order.orderStatus}
          </ThemedText>
        </View>
        {chatEnabled ? <OrderChatButton orderId={order._id} compact enabled /> : <View style={{ width: 32 }} />}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.progressSection}>
          <DeliveryProgressBar status={order.orderStatus} />
        </View>

        {isGetAnythingOrder(order) ? (
          <OrderLocationBlock
            type="pickup"
            title="Get Anything request"
            name="Buy from any shop"
            address="The customer listed these items. Buy them from any shop and enter what you paid."
          />
        ) : pickups.length > 1 ? (
          <OrderPickupsSummaryBlock
            title={`Pickups · ${pickups.length} shops`}
            names={pickups.map((p) => p.restaurantName || 'Store')}
            addresses={pickups.map((p) => formatPickupAddress(p))}
          />
        ) : pickups.length ? (
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
          name={customer?.fullName ?? 'Customer'}
          address={formatDeliveryAddress(order)}
          phone={customer?.mobile}
        />

        {chatEnabled ? <OrderChatButton orderId={order._id} enabled /> : null}

        {awaitingCustomer ? (
          <View
            style={[
              styles.noteCard,
              cardStyle,
              { backgroundColor: theme.dangerSoft ?? '#FEE2E2', borderColor: theme.danger },
            ]}
          >
            <ThemedText type="label" style={{ color: theme.danger }}>
              Out of stock reported
            </ThemedText>
            <ThemedText style={styles.noteBody}>
              Customer was notified to cancel and place a new order. You are released from this
              delivery.
            </ThemedText>
          </View>
        ) : null}

        {customerNote ? (
          <View
            style={[
              styles.noteCard,
              cardStyle,
              { backgroundColor: theme.primarySoft, borderColor: theme.border },
            ]}
          >
            <ThemedText type="label" style={{ color: theme.primary }}>
              Customer note / comments
            </ThemedText>
            <ThemedText style={styles.noteBody}>{customerNote}</ThemedText>
          </View>
        ) : null}

        {isGetAnythingOrder(order) ? (
          <GetAnythingAmountsCard
            order={order}
            canEnterPurchase={canEnterPurchaseAmount(order)}
            onEnterPurchase={() => setPurchaseOpen(true)}
          />
        ) : null}

        <View style={[styles.summaryCard, cardStyle, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="label" themeColor="textSecondary">
            Order summary
          </ThemedText>
          {pickups.length > 1 ? (
            <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 4 }}>
              {formatPickupNames(order)}
            </ThemedText>
          ) : null}
          {showOosReport ? (
            <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: Spacing.two }}>
              Tap items that are out of stock, then report below.
            </ThemedText>
          ) : null}

          {items.length ? (
            <View style={styles.itemsList}>
              {items.map((item, i) => {
                const itemId = String(item.id ?? item._id ?? '');
                const itemStoreId = (item as { restaurantId?: string }).restaurantId;
                const storeLabel =
                  pickups.length > 1 && itemStoreId
                    ? pickups.find((p) => p._id === itemStoreId)?.restaurantName
                    : null;
                const itemNote = String(
                  (item as { specialInstructions?: string | null }).specialInstructions || '',
                ).trim();
                const isUnavailable =
                  String(item.fulfillmentStatus ?? '').toUpperCase() === 'UNAVAILABLE';
                const selected = Boolean(itemId && selectedOosIds.includes(itemId));
                const row = (
                  <>
                    {showOosReport && itemId && !isUnavailable ? (
                      <Ionicons
                        name={selected ? 'checkbox' : 'square-outline'}
                        size={22}
                        color={selected ? theme.danger : theme.textSecondary}
                      />
                    ) : null}
                    <ThemedText style={styles.itemQty}>{item.quantity}x</ThemedText>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <ThemedText
                        style={[styles.itemName, isUnavailable && { color: theme.danger }]}
                        numberOfLines={2}
                      >
                        {item.itemName}
                      </ThemedText>
                      {isUnavailable ? (
                        <ThemedText type="small" style={{ color: theme.danger, marginTop: 2 }}>
                          Out of stock
                        </ThemedText>
                      ) : null}
                      {item.imageUrls && item.imageUrls.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }} contentContainerStyle={{ gap: 8 }}>
                          {item.imageUrls.map((url, k) => (
                            <Pressable
                              key={`${url}-${k}`}
                              onPress={() => setPhotoPreview(url)}
                              accessibilityRole="imagebutton"
                              accessibilityLabel="Open customer reference photo"
                            >
                              <Image
                                source={{ uri: url }}
                                style={{ width: 96, height: 96, borderRadius: 10, backgroundColor: theme.backgroundElement }}
                              />
                            </Pressable>
                          ))}
                        </ScrollView>
                      ) : null}
                      {storeLabel ? (
                        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                          {storeLabel}
                        </ThemedText>
                      ) : null}
                      {itemNote ? (
                        <ThemedText type="small" style={{ color: theme.primary, marginTop: 2 }} numberOfLines={3}>
                          Note: {itemNote}
                        </ThemedText>
                      ) : null}
                    </View>
                  </>
                );
                return showOosReport && itemId && !isUnavailable ? (
                  <Pressable
                    key={itemId || i}
                    onPress={() => toggleOosItem(itemId)}
                    style={[styles.itemRow, i > 0 && { borderTopColor: theme.border, borderTopWidth: 1 }]}
                  >
                    {row}
                  </Pressable>
                ) : (
                  <View
                    key={itemId || i}
                    style={[styles.itemRow, i > 0 && { borderTopColor: theme.border, borderTopWidth: 1 }]}
                  >
                    {row}
                  </View>
                );
              })}
            </View>
          ) : (
            <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: Spacing.two }}>
              {count ? `${count} items` : 'Item list not available'}
            </ThemedText>
          )}

          {showOosReport ? (
            <Pressable
              onPress={confirmReportOos}
              disabled={oosMut.isPending || !selectedOosIds.length}
              style={[
                styles.oosBtn,
                {
                  borderColor: theme.danger,
                  opacity: oosMut.isPending || !selectedOosIds.length ? 0.45 : 1,
                },
              ]}
            >
              {oosMut.isPending ? (
                <ActivityIndicator color={theme.danger} />
              ) : (
                <>
                  <Ionicons name="alert-circle-outline" size={18} color={theme.danger} />
                  <ThemedText style={[styles.oosBtnText, { color: theme.danger }]}>
                    Report out of stock
                    {selectedOosIds.length ? ` (${selectedOosIds.length})` : ''}
                  </ThemedText>
                </>
              )}
            </Pressable>
          ) : null}

          <View style={[styles.totalsRow, { borderTopColor: theme.border }]}>
            <ThemedText style={styles.totalLabel}>Order total</ThemedText>
            <ThemedText style={styles.totalValue}>{formatOrderTotal(order)}</ThemedText>
          </View>
          <View style={styles.totalsRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Delivery fee
            </ThemedText>
            <ThemedText style={[styles.earnValue, { color: theme.partner }]}>
              +{formatJmd(riderEarningForOrder(order))}
            </ThemedText>
          </View>
          {order.tipAmount ? (
            <View style={styles.totalsRow}>
              <ThemedText type="small" themeColor="textSecondary">
                Includes tip
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatJmd(order.tipAmount)}
              </ThemedText>
            </View>
          ) : null}
          {order.paymentMethod === 'COD' ? (
            <View style={[styles.codRow, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="cash-outline" size={16} color={theme.primary} />
              <ThemedText style={[styles.codText, { color: theme.primary }]}>
                Collect {formatCashDue(order as never)} cash on delivery
                {order.payInUsd ? ' (USD)' : ''}
              </ThemedText>
            </View>
          ) : (
            <View style={[styles.codRow, { backgroundColor: theme.partnerSoft }]}>
              <Ionicons name="card-outline" size={16} color={theme.partner} />
              <ThemedText style={[styles.codText, { color: theme.partner }]}>
                {pay === 'COLLECTED' || pay === 'APPROVED'
                  ? 'Bank · Settled — collect no cash'
                  : 'Bank · Deliver now — payment verifies after delivery'}
              </ThemedText>
            </View>
          )}
        </View>
      </ScrollView>

      {(isAvailable || next) ? (
        <View style={[styles.footer, { backgroundColor: theme.backgroundElement, borderTopColor: theme.border }]}>
          {isAvailable ? (
            <Pressable
              onPress={() => runRiderAction('accept')}
              disabled={actionMut.isPending}
              style={[
                styles.cta,
                {
                  backgroundColor: theme.partner,
                  opacity: actionMut.isPending ? 0.55 : 1,
                },
              ]}>
              {actionMut.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.ctaText}>Accept delivery</ThemedText>
              )}
            </Pressable>
          ) : next ? (
            <SwipeToConfirm
              key={`swipe-${swipeKey}`}
              label={actionButtonLabel(next, order)}
              busy={actionMut.isPending}
              disabled={actionMut.isPending}
              onConfirm={() => {
                const deferredFee = Boolean(
                  (order as { deliveryFeeDeferred?: boolean }).deliveryFeeDeferred ||
                    (order as { settlement?: { deliveryFeeDeferred?: boolean } }).settlement
                      ?.deliveryFeeDeferred,
                );
                // COD always, and Get Anything (any pay method) — rider sets fee + customer confirms.
                if (next === 'complete' && (order.paymentMethod === 'COD' || deferredFee)) {
                  router.push(`/order/payment/${orderId}` as never);
                  setSwipeKey((k) => k + 1);
                  return;
                }
                void runRiderAction(next);
              }}
            />
          ) : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  photoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  photoFull: { width: '100%', height: '80%' },
  photoClose: { position: 'absolute', top: 48, right: 20, padding: 8 },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  navBack: { width: 32 },
  navCenter: { flex: 1, alignItems: 'center' },
  navTitle: { fontSize: 16, fontFamily: Fonts.extraBold },
  scroll: { padding: Layout.screenPadding, paddingBottom: Spacing.four },
  progressSection: { marginBottom: Spacing.three },
  summaryCard: { padding: Spacing.three },
  noteCard: {
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderWidth: 1,
    gap: 6,
  },
  noteBody: { fontSize: 14, fontFamily: Fonts.medium, lineHeight: 20 },
  itemsList: { marginTop: Spacing.two },
  itemRow: { flexDirection: 'row', gap: Spacing.two, paddingVertical: 10 },
  itemQty: { fontSize: 14, fontFamily: Fonts.bold, width: 28 },
  itemName: { flex: 1, fontSize: 14, fontFamily: Fonts.medium },
  oosBtn: {
    marginTop: Spacing.three,
    borderWidth: 1,
    borderRadius: Layout.buttonRadius,
    paddingVertical: 12,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  oosBtnText: { fontSize: 14, fontFamily: Fonts.bold },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
  },
  totalLabel: { fontSize: 14, fontFamily: Fonts.bold },
  totalValue: { fontSize: 20, fontFamily: Fonts.extraBold },
  earnValue: { fontSize: 16, fontFamily: Fonts.extraBold },
  codRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
    padding: Spacing.two,
    borderRadius: Layout.inputRadius,
  },
  codText: { fontSize: 13, fontFamily: Fonts.bold, flex: 1 },
  footer: {
    padding: Layout.screenPadding,
    paddingBottom: Spacing.three,
    borderTopWidth: 1,
  },
  cta: {
    borderRadius: Layout.buttonRadius,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontFamily: Fonts.extraBold, fontSize: 15 },
  errorTitle: { fontSize: 17, fontFamily: Fonts.bold, marginTop: Spacing.two },
  errorSub: { textAlign: 'center', marginTop: Spacing.one, maxWidth: 280 },
  backBtn: {
    marginTop: Spacing.three,
    borderWidth: 1,
    borderRadius: Layout.buttonRadius,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
});
