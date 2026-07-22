import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { DeliveryProgressBar } from '@/components/DeliveryProgressBar';
import { DeliveryMap } from '@/components/delivery-map';
import { OrderLocationBlock } from '@/components/OrderLocationBlock';
import { ThemedText } from '@/components/themed-text';
import { actionButtonLabel, nextRiderAction, RIDER_STATUS_LABELS } from '@/constants/deliveryStatus';
import { cardStyle, Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useOrderLocationPing } from '@/hooks/use-order-location-ping';
import { useRiderGps } from '@/hooks/use-rider-gps';
import {
  formatDeliveryAddress,
  formatRestaurantAddress,
  itemCount,
  orderDisplayId,
  pickCustomerCoord,
  pickRestaurantCoord,
  pickRiderCoord,
} from '@/lib/orderDisplay';
import { useOrderRoutePath } from '@/hooks/use-order-route-path';
import { useRiderOrderQuery } from '@/hooks/queries/rider';
import {
  invalidateAfterDeliveryComplete,
  invalidateAfterOrderAction,
} from '@/lib/riderQueryInvalidation';
import {
  acceptOrder,
  completeDelivery,
  pickupOrder,
  rejectOrder,
  startDelivery,
  RIDER_FEE,
} from '@/services/riders';

function resolveOrderId(raw: string | string[] | undefined): string | undefined {
  if (!raw) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

export default function OrderDetailScreen() {
  const params = useLocalSearchParams<{ orderId: string }>();
  const orderId = resolveOrderId(params.orderId);
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();

  const orderQ = useRiderOrderQuery(orderId);

  useOrderLocationPing(orderQ.data?.orderStatus);

  const isActiveTrip = Boolean(
    orderQ.data?.orderStatus &&
      ['RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'READY_FOR_PICKUP'].includes(orderQ.data.orderStatus),
  );
  const riderGps = useRiderGps(isActiveTrip);
  const orderDetail = orderQ.data;
  const restaurantCoord = orderDetail ? pickRestaurantCoord(orderDetail) : null;
  const customerCoord = orderDetail ? pickCustomerCoord(orderDetail) : null;
  const riderCoord = pickRiderCoord(
    riderGps ? { latitude: riderGps.latitude, longitude: riderGps.longitude } : null,
    orderDetail,
  );

  const routeQ = useOrderRoutePath({
    orderId,
    orderStatus: orderDetail?.orderStatus,
    restaurant: restaurantCoord,
    customer: customerCoord,
    rider: riderCoord,
    enabled: Boolean(orderDetail),
  });

  const actionMut = useMutation({
    mutationFn: async (action: 'accept' | 'pickup' | 'start' | 'complete' | 'reject') => {
      if (!orderId) throw new Error('Missing order');
      if (action === 'accept') return acceptOrder(orderId);
      if (action === 'pickup') return pickupOrder(orderId);
      if (action === 'start') return startDelivery(orderId);
      if (action === 'complete') return completeDelivery(orderId);
      return rejectOrder(orderId);
    },
    onSuccess: (_, action) => {
      if (!orderId) return;
      if (action === 'complete') {
        invalidateAfterDeliveryComplete(qc, orderId);
      } else {
        invalidateAfterOrderAction(qc, orderId);
      }
      if (action === 'accept' || action === 'complete') {
        router.replace('/(tabs)/orders');
      }
    },
    onError: (e) => Alert.alert('Failed', e instanceof Error ? e.message : 'Try again'),
  });

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
  const restaurantName =
    typeof order.restaurantId === 'object' ? order.restaurantId?.restaurantName ?? 'Restaurant' : 'Restaurant';
  const restaurantPhone =
    typeof order.restaurantId === 'object'
      ? (order.restaurantId as { phone?: string })?.phone
      : undefined;
  const customer = typeof order.customerId === 'object' ? order.customerId : undefined;
  const hasRider = Boolean(order.riderId);
  const isAvailable = order.orderStatus === 'READY_FOR_PICKUP' && !hasRider;
  const next = isAvailable ? null : nextRiderAction(order.orderStatus);
  const items = order.items ?? order.orderItems ?? [];
  const count = itemCount(order);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
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
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.mapSection}>
          <DeliveryMap
            restaurant={restaurantCoord}
            customer={customerCoord}
            rider={riderCoord}
            riderHeading={riderGps?.heading}
            routePath={routeQ.data}
            routeLoading={routeQ.isLoading}
            followRider={isActiveTrip}
            orderStatus={order.orderStatus}
            height={220}
          />
        <Pressable
          onPress={() => router.push(`/order/map/${orderId}` as never)}
          style={[styles.expandMapBtn, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
        >
          <Ionicons name="expand-outline" size={16} color={theme.primary} />
          <ThemedText type="small" style={{ color: theme.primary, fontFamily: Fonts.bold }}>
            Open full trip map
          </ThemedText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.progressSection}>
          <DeliveryProgressBar status={order.orderStatus} />
        </View>

        <OrderLocationBlock
          type="pickup"
          title="Pickup from"
          name={restaurantName}
          address={formatRestaurantAddress(order)}
          phone={restaurantPhone}
        />
        <OrderLocationBlock
          type="drop"
          title="Deliver to"
          name={customer?.fullName ?? 'Customer'}
          address={formatDeliveryAddress(order)}
          phone={customer?.mobile}
        />

        <View style={[styles.summaryCard, cardStyle, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="label" themeColor="textSecondary">
            Order summary
          </ThemedText>
          {items.length ? (
            <View style={styles.itemsList}>
              {items.map((item, i) => (
                <View key={i} style={[styles.itemRow, i > 0 && { borderTopColor: theme.border, borderTopWidth: 1 }]}>
                  <ThemedText style={styles.itemQty}>{item.quantity}x</ThemedText>
                  <ThemedText style={styles.itemName} numberOfLines={2}>
                    {item.itemName}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : (
            <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: Spacing.two }}>
              {count ? `${count} items` : 'Item list not available'}
            </ThemedText>
          )}

          <View style={[styles.totalsRow, { borderTopColor: theme.border }]}>
            <ThemedText style={styles.totalLabel}>Order total</ThemedText>
            <ThemedText style={styles.totalValue}>₹{order.grandTotal}</ThemedText>
          </View>
          <View style={styles.totalsRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Your earning
            </ThemedText>
            <ThemedText style={[styles.earnValue, { color: theme.partner }]}>+₹{RIDER_FEE}</ThemedText>
          </View>
          {order.paymentMethod === 'COD' ? (
            <View style={[styles.codRow, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="cash-outline" size={16} color={theme.primary} />
              <ThemedText style={[styles.codText, { color: theme.primary }]}>
                Collect ₹{order.grandTotal} cash on delivery
              </ThemedText>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {(isAvailable || next) ? (
        <View style={[styles.footer, { backgroundColor: theme.backgroundElement, borderTopColor: theme.border }]}>
          <Pressable
            onPress={() => {
              if (isAvailable) actionMut.mutate('accept');
              else if (next) actionMut.mutate(next);
            }}
            disabled={actionMut.isPending}
            style={[
              styles.cta,
              {
                backgroundColor: isAvailable ? theme.partner : theme.primary,
                opacity: actionMut.isPending ? 0.7 : 1,
              },
            ]}>
            {actionMut.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.ctaText}>
                {isAvailable ? 'Accept delivery' : next ? actionButtonLabel(next) : 'View order'}
              </ThemedText>
            )}
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  mapSection: { marginBottom: Spacing.three, paddingHorizontal: Layout.screenPadding, gap: Spacing.two },
  expandMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Layout.inputRadius,
    borderWidth: 1,
  },
  summaryCard: { padding: Spacing.three },
  itemsList: { marginTop: Spacing.two },
  itemRow: { flexDirection: 'row', gap: Spacing.two, paddingVertical: 10 },
  itemQty: { fontSize: 14, fontFamily: Fonts.bold, width: 28 },
  itemName: { flex: 1, fontSize: 14, fontFamily: Fonts.medium },
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
