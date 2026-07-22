import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo } from 'react';

import { DeliveryMap } from '@/components/delivery-map';
import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useOrderLocationPing } from '@/hooks/use-order-location-ping';
import { useRiderGps } from '@/hooks/use-rider-gps';
import { useOrderRoutePath } from '@/hooks/use-order-route-path';
import { useRiderOrderQuery } from '@/hooks/queries/rider';
import { orderDisplayId, pickCustomerCoord, pickRestaurantCoord, pickRiderCoord } from '@/lib/orderDisplay';

function resolveOrderId(raw: string | string[] | undefined): string | undefined {
  if (!raw) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

const LegendDot = memo(function LegendDot({
  color,
  icon,
  label,
}: {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendPin, { backgroundColor: color }]}>
        <Ionicons name={icon} size={12} color="#ffffff" />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
});

export default function RiderTripMapScreen() {
  const params = useLocalSearchParams<{ orderId: string }>();
  const orderId = resolveOrderId(params.orderId);
  const theme = useTheme();
  const router = useRouter();

  const orderQ = useRiderOrderQuery(orderId);
  const order = orderQ.data;

  const isActiveTrip = useMemo(
    () =>
      Boolean(
        order?.orderStatus &&
          ['RIDER_ASSIGNED', 'PICKED_UP', 'ON_THE_WAY', 'READY_FOR_PICKUP'].includes(order.orderStatus),
      ),
    [order?.orderStatus],
  );

  useOrderLocationPing(order?.orderStatus);
  const riderGps = useRiderGps(isActiveTrip);

  const restaurant = useMemo(() => (order ? pickRestaurantCoord(order) : null), [order]);
  const customer = useMemo(() => (order ? pickCustomerCoord(order) : null), [order]);
  const riderCoord = useMemo(
    () =>
      pickRiderCoord(
        riderGps ? { latitude: riderGps.latitude, longitude: riderGps.longitude } : null,
        order,
      ),
    [riderGps, order],
  );

  const routeQ = useOrderRoutePath({
    orderId,
    orderStatus: order?.orderStatus,
    restaurant,
    customer,
    rider: riderCoord,
    enabled: Boolean(order) && isActiveTrip,
  });

  if (!orderId) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <ThemedText>Invalid order</ThemedText>
      </SafeAreaView>
    );
  }

  if (orderQ.isLoading && !order) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (orderQ.isError || !order) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <ThemedText>Could not load trip map</ThemedText>
        <Pressable onPress={() => router.back()}>
          <ThemedText type="link" style={{ marginTop: Spacing.two }}>
            Go back
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.root}>
      <DeliveryMap
        restaurant={restaurant}
        customer={customer}
        rider={riderCoord}
        riderHeading={riderGps?.heading}
        routePath={routeQ.data}
        routeLoading={routeQ.isLoading && !routeQ.data}
        followRider={isActiveTrip}
        orderStatus={order.orderStatus}
        fullScreen
      />

      <SafeAreaView edges={['top']} style={styles.headerOverlay} pointerEvents="box-none">
        <View style={[styles.header, { backgroundColor: 'rgba(255,255,255,0.94)', borderColor: theme.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <ThemedText style={styles.headerTitle}>Trip map</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {orderDisplayId(order)}
            </ThemedText>
          </View>
          <View style={{ width: 32 }} />
        </View>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.legendOverlay} pointerEvents="box-none">
        <View style={[styles.legend, { backgroundColor: 'rgba(255,255,255,0.94)' }]}>
          <LegendDot color="#ff5a00" icon="restaurant" label="Pickup" />
          <LegendDot color="#00BCD4" icon="navigate" label="You" />
          <LegendDot color="#1a1c1c" icon="home" label="Drop" />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#e8e8e8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Layout.screenPadding,
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: 14,
    borderWidth: 1,
  },
  backBtn: { width: 32 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontFamily: Fonts.extraBold },
  legendOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginHorizontal: Layout.screenPadding,
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 14,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendPin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
