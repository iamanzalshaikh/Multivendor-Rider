import { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useQueries } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { RIDER_STATUS_LABELS } from '@/constants/deliveryStatus';
import { Layout, cardStyle } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { riderKeys } from '@/hooks/queries/keys';
import { useTheme } from '@/hooks/use-theme';
import { formatJmd } from '@/lib/money';
import {
  formatDeliveryAddress,
  formatRestaurantAddress,
} from '@/lib/orderDisplay';
import { fetchOrderById } from '@/services/riders';
import type { RiderOrder } from '@/types/rider';

type Props = {
  orderIds: string[];
};

const COL = {
  seq: 36,
  order: 78,
  customer: 110,
  pickup: 140,
  drop: 140,
  total: 96,
  status: 88,
} as const;

function lastSix(order: RiderOrder): string {
  const raw = String(order.orderNumber ?? order._id ?? '');
  const digits = raw.replace(/\D/g, '');
  const slice = (digits || raw).slice(-6).toUpperCase();
  return slice || '------';
}

function customerName(order: RiderOrder): string {
  const c = order.customerId;
  if (c && typeof c === 'object' && c.fullName) return c.fullName;
  return 'Customer';
}

function pickupLabel(order: RiderOrder): string {
  const r = order.restaurantId;
  if (r && typeof r === 'object' && r.restaurantName) return r.restaurantName;
  return formatRestaurantAddress(order);
}

function dropLabel(order: RiderOrder): string {
  return formatDeliveryAddress(order);
}

export function ActiveTripsSummaryTable({ orderIds }: Props) {
  const theme = useTheme();
  const router = useRouter();

  const queries = useQueries({
    queries: orderIds.map((id) => ({
      queryKey: riderKeys.order(id),
      queryFn: () => fetchOrderById(id),
      staleTime: 15_000,
      enabled: Boolean(id),
    })),
  });

  const rows = useMemo(() => {
    return orderIds.map((id, index) => {
      const q = queries[index];
      return {
        id,
        index: index + 1,
        order: q?.data as RiderOrder | undefined,
        loading: Boolean(q?.isLoading && !q?.data),
      };
    });
  }, [orderIds, queries]);

  if (orderIds.length === 0) return null;

  const loadingAll = rows.every((r) => r.loading);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={[styles.headerIcon, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="list" size={16} color={theme.primary} />
        </View>
        <View style={styles.headerText}>
          <ThemedText style={styles.title}>Order summary</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {orderIds.length} active · deliver in listed order
          </ThemedText>
        </View>
      </View>

      <View
        style={[
          styles.tableCard,
          cardStyle,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}
      >
        {loadingAll ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={theme.primary} />
            <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 8 }}>
              Loading orders…
            </ThemedText>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            bounces={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View>
              {/* Header */}
              <View style={[styles.row, styles.headRow, { borderBottomColor: theme.border }]}>
                <ThemedText style={[styles.headCell, { width: COL.seq }]}>#</ThemedText>
                <ThemedText style={[styles.headCell, { width: COL.order }]}>Order</ThemedText>
                <ThemedText style={[styles.headCell, { width: COL.customer }]}>Customer</ThemedText>
                <ThemedText style={[styles.headCell, { width: COL.pickup }]}>Pickup</ThemedText>
                <ThemedText style={[styles.headCell, { width: COL.drop }]}>Drop</ThemedText>
                <ThemedText style={[styles.headCell, { width: COL.total }]}>Total</ThemedText>
                <ThemedText style={[styles.headCell, { width: COL.status }]}>Status</ThemedText>
              </View>

              {rows.map((row, i) => {
                const order = row.order;
                const zebra = i % 2 === 1;
                if (!order) {
                  return (
                    <View
                      key={row.id}
                      style={[
                        styles.row,
                        zebra && { backgroundColor: theme.backgroundSelected },
                      ]}
                    >
                      <ThemedText style={[styles.cell, { width: COL.seq }]}>{row.index}</ThemedText>
                      <ThemedText
                        style={[styles.cellMuted, { width: COL.order + COL.customer }]}
                        numberOfLines={1}
                      >
                        Loading…
                      </ThemedText>
                    </View>
                  );
                }

                const statusLabel =
                  RIDER_STATUS_LABELS[order.orderStatus] ??
                  order.orderStatus.replace(/_/g, ' ');

                return (
                  <Pressable
                    key={row.id}
                    onPress={() => router.push(`/order/${order._id}` as never)}
                    style={({ pressed }) => [
                      styles.row,
                      zebra && { backgroundColor: theme.backgroundSelected },
                      pressed && { opacity: 0.85 },
                      { borderBottomColor: theme.border },
                      i < rows.length - 1 && styles.rowBorder,
                    ]}
                  >
                    <View style={[styles.seqWrap, { width: COL.seq }]}>
                      <View style={[styles.seqBadge, { backgroundColor: theme.primarySoft }]}>
                        <ThemedText style={[styles.seqText, { color: theme.primary }]}>
                          {row.index}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText
                      style={[styles.cellBold, { width: COL.order, color: theme.primary }]}
                      numberOfLines={1}
                    >
                      …{lastSix(order)}
                    </ThemedText>
                    <ThemedText style={[styles.cell, { width: COL.customer }]} numberOfLines={1}>
                      {customerName(order)}
                    </ThemedText>
                    <ThemedText style={[styles.cell, { width: COL.pickup }]} numberOfLines={2}>
                      {pickupLabel(order)}
                    </ThemedText>
                    <ThemedText style={[styles.cell, { width: COL.drop }]} numberOfLines={2}>
                      {dropLabel(order)}
                    </ThemedText>
                    <ThemedText style={[styles.cellBold, { width: COL.total }]} numberOfLines={1}>
                      {formatJmd(order.grandTotal)}
                    </ThemedText>
                    <ThemedText
                      style={[styles.cellMuted, { width: COL.status }]}
                      numberOfLines={2}
                    >
                      {statusLabel}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Layout.screenPadding,
    marginBottom: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  title: {
    fontSize: 15,
    fontFamily: Fonts.extraBold,
  },
  tableCard: {
    overflow: 'hidden',
    borderRadius: Layout.cardRadius,
  },
  loadingBox: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  headRow: {
    minHeight: 36,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headCell: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingRight: 8,
    opacity: 0.7,
  },
  cell: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    paddingRight: 8,
  },
  cellBold: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    paddingRight: 8,
  },
  cellMuted: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    paddingRight: 8,
    opacity: 0.75,
  },
  seqWrap: {
    paddingRight: 6,
    alignItems: 'flex-start',
  },
  seqBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  seqText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
  },
});
