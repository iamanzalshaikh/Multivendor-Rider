import { useQueryClient } from '@tanstack/react-query';
import { View, StyleSheet, RefreshControl, Pressable, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { memo, useCallback, useState } from 'react';

import { EarningsHeroCard } from '@/components/EarningsHeroCard';
import { ScreenHeader } from '@/components/screen-header';
import { SectionCard } from '@/components/section-card';
import { RiderEarningsSkeleton, SkeletonBlock } from '@/components/skeleton';
import { StatCard, StatGrid } from '@/components/stat-card';
import { TabScrollView } from '@/components/tab-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import {
  prefetchRiderOrder,
  useDeliveryHistoryQuery,
  useEarningsSummaryQuery,
  usePayoutHistoryQuery,
  useRiderEarningsQuery,
  useShiftPurchasesQuery,
} from '@/hooks/queries/rider';
import { useTheme } from '@/hooks/use-theme';
import { formatJmd, riderEarningForOrder } from '@/lib/money';
import { orderDisplayId } from '@/lib/orderDisplay';
import type { RiderOrder } from '@/types/rider';

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatPayoutStatus(status: string) {
  return status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function statusColor(status: string, theme: ReturnType<typeof useTheme>) {
  const s = status.toLowerCase();
  if (s.includes('paid') || s.includes('approved') || s.includes('completed')) return theme.partner;
  if (s.includes('reject') || s.includes('fail')) return theme.danger;
  return theme.warning;
}

const DeliveryHistoryRow = memo(function DeliveryHistoryRow({
  item,
  isLast,
  theme,
  onPress,
  onPressIn,
}: {
  item: RiderOrder;
  isLast: boolean;
  theme: ReturnType<typeof useTheme>;
  onPress: () => void;
  onPressIn: () => void;
}) {
  return (
    <Pressable
      onPressIn={onPressIn}
      onPress={onPress}
      style={[
        styles.historyRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: theme.border },
      ]}>
      <View style={[styles.tripIcon, { backgroundColor: theme.partnerSoft }]}>
        <Ionicons name="bicycle" size={18} color={theme.partner} />
      </View>
      <View style={styles.historyLeft}>
        <ThemedText style={styles.historyId}>{orderDisplayId(item)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {typeof item.restaurantId === 'object'
            ? item.restaurantId?.restaurantName ?? 'Delivery'
            : 'Delivery'}
        </ThemedText>
      </View>
      <View style={styles.historyRight}>
        <ThemedText style={[styles.historyEarn, { color: theme.partner }]}>
          +{formatJmd(riderEarningForOrder(item))}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {item.paymentMethod === 'COD' ? 'Cash' : 'Online'}
        </ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
    </Pressable>
  );
});

export default function EarningsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const [focused, setFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  const earningsQ = useRiderEarningsQuery(focused);
  const summaryQ = useEarningsSummaryQuery(focused);
  const historyQ = useDeliveryHistoryQuery(1, 30, focused);
  const payoutsQ = usePayoutHistoryQuery(1, 10, focused);
  const shiftPurchasesQ = useShiftPurchasesQuery(focused);

  const earnings = earningsQ.data;
  const summary = summaryQ.data;
  const history = historyQ.data?.orders ?? [];
  const payouts = payoutsQ.data?.payouts ?? [];
  const shift = shiftPurchasesQ.data?.shift;
  const pendingAmount = summary?.pendingPayout?.grossEarnings ?? 0;
  const paidAmount = summary?.totalPaidOut?.grossEarnings ?? 0;
  const unpaidCount = summary?.pendingPayout?.deliveryCount ?? 0;
  const refreshing =
    historyQ.isRefetching ||
    earningsQ.isRefetching ||
    summaryQ.isRefetching ||
    payoutsQ.isRefetching ||
    shiftPurchasesQ.isRefetching;

  if (earningsQ.isLoading && summaryQ.isLoading && !earningsQ.data && !summaryQ.data) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Earnings" subtitle="Loading…" />
        <RiderEarningsSkeleton />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <TabScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              historyQ.refetch();
              earningsQ.refetch();
              summaryQ.refetch();
              payoutsQ.refetch();
              shiftPurchasesQ.refetch();
            }}
          />
        }>
        <ScreenHeader title="Earnings" subtitle="Float, payouts, and trips" />

        <View style={styles.content}>
          <EarningsHeroCard
            todayAmount={earnings?.todayEarnings ?? 0}
            icon="wallet"
            meta={[
              { value: formatJmd(earnings?.totalEarnings), label: 'All time' },
              { value: `${earnings?.totalDeliveries ?? 0}`, label: 'Trips' },
              { value: formatJmd(pendingAmount), label: 'Pending' },
            ]}
          />

          {shift ? (
            <Pressable
              onPress={() => router.push('/purchase')}
              style={[styles.floatCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={styles.floatHeader}>
                <ThemedText style={styles.historyId}>Today&apos;s float</ThemedText>
                <ThemedText type="link" style={{ fontSize: 12 }}>
                  Log purchase
                </ThemedText>
              </View>
              <View style={styles.floatRow}>
                <View style={styles.floatCol}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Opening
                  </ThemedText>
                  <ThemedText style={styles.floatValue}>{formatJmd(shift.floatIssued)}</ThemedText>
                </View>
                <View style={styles.floatCol}>
                  <ThemedText type="small" themeColor="textSecondary">
                    You keep
                  </ThemedText>
                  <ThemedText style={[styles.floatValue, { color: theme.partner }]}>
                    {formatJmd(shift.riderKeep)}
                  </ThemedText>
                </View>
                <View style={styles.floatCol}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Return to admin
                  </ThemedText>
                  <ThemedText style={[styles.floatValue, { color: theme.primary }]}>
                    {formatJmd(shift.expectedCashReturn)}
                  </ThemedText>
                </View>
              </View>
              <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: Spacing.two }}>
                COD collected {formatJmd(shift.cashCollected)} · Purchases{' '}
                {formatJmd(shift.cashSpentPurchases)}
              </ThemedText>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push('/purchase')}
              style={[styles.floatCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <View style={styles.floatHeader}>
                <View style={{ flex: 1 }}>
                  <ThemedText style={styles.historyId}>Rider float</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    No open shift — ask admin to issue float, or start one here
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
              </View>
            </Pressable>
          )}

          <StatGrid>
            <StatCard
              label="Pending payout"
              value={formatJmd(pendingAmount)}
              hint={`${unpaidCount} unpaid`}
              icon="hourglass-outline"
              accent="primary"
            />
            <StatCard
              label="Paid out"
              value={formatJmd(paidAmount)}
              hint="Transferred"
              icon="checkmark-circle-outline"
              accent="partner"
            />
          </StatGrid>

          <SectionCard title="Recent deliveries" subtitle="Last 30 completed trips" noPadding>
            {historyQ.isLoading ? (
              <View style={{ padding: Spacing.three, gap: Spacing.three }}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <SkeletonBlock width={40} height={40} radius={12} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <SkeletonBlock width="50%" height={13} />
                      <SkeletonBlock width="30%" height={11} />
                    </View>
                    <SkeletonBlock width={52} height={14} />
                  </View>
                ))}
              </View>
            ) : history.length ? (
              <FlatList
                data={history}
                keyExtractor={(item) => item._id}
                scrollEnabled={false}
                initialNumToRender={8}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
                renderItem={({ item, index }) => (
                  <DeliveryHistoryRow
                    item={item}
                    isLast={index === history.length - 1}
                    theme={theme}
                    onPressIn={() => prefetchRiderOrder(qc, item._id)}
                    onPress={() => router.push(`/order/${item._id}` as never)}
                  />
                )}
              />
            ) : (
              <View style={styles.empty}>
                <Ionicons name="receipt-outline" size={32} color={theme.textSecondary} />
                <ThemedText style={styles.emptyTitle}>No deliveries yet</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptySub}>
                  Go online and accept jobs to start earning.
                </ThemedText>
              </View>
            )}
          </SectionCard>

          {payouts.length > 0 ? (
            <SectionCard title="Payout history" subtitle="Transfers from admin" noPadding>
              {payouts.map((p, i) => (
                <View
                  key={p._id}
                  style={[
                    styles.historyRow,
                    i < payouts.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                  ]}>
                  <View style={[styles.tripIcon, { backgroundColor: theme.partnerSoft }]}>
                    <Ionicons name="cash-outline" size={18} color={theme.partner} />
                  </View>
                  <View style={styles.historyLeft}>
                    <ThemedText style={styles.historyId}>
                      {formatJmd(p.netPayable ?? p.amount ?? 0)}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: statusColor(p.status, theme) }}>
                      {formatPayoutStatus(p.status)}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatDate(p.paidAt)}
                  </ThemedText>
                </View>
              ))}
            </SectionCard>
          ) : null}
        </View>
      </TabScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Spacing.four,
  },
  floatCard: {
    borderWidth: 1,
    borderRadius: Layout.cardRadius,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  floatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  floatRow: { flexDirection: 'row', gap: Spacing.two },
  floatCol: { flex: 1, gap: 2 },
  floatValue: { fontSize: 15, fontFamily: Fonts.extraBold },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    gap: Spacing.two,
  },
  tripIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyLeft: { flex: 1, minWidth: 0 },
  historyRight: { alignItems: 'flex-end' },
  historyId: { fontSize: 14, fontFamily: Fonts.bold },
  historyEarn: { fontSize: 15, fontFamily: Fonts.extraBold },
  empty: {
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.one,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    marginTop: Spacing.one,
  },
  emptySub: { textAlign: 'center' },
});
