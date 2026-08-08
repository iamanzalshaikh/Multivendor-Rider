import { useMutation, useQueryClient } from '@tanstack/react-query';
import { View, StyleSheet, RefreshControl, ActivityIndicator, Alert, Pressable, FlatList, Platform } from 'react-native';
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
  const purchases = shiftPurchasesQ.data?.purchases ?? [];
  const pendingAmount = summary?.pendingPayout?.grossEarnings ?? 0;
  const paidAmount = summary?.totalPaidOut?.grossEarnings ?? 0;
  const unpaidCount = summary?.pendingPayout?.deliveryCount ?? 0;
  const perDelivery = summary?.earningPerDelivery ?? 0;
  const cash = summary?.cash;
  const online = summary?.online;
  const awaiting = summary?.awaitingVerification;
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
        <ScreenHeader title="Earnings" subtitle="Track payouts, trips, and purchases" />

        <View style={styles.content}>
          <EarningsHeroCard
            todayAmount={earnings?.todayEarnings ?? 0}
            icon="wallet"
            meta={[
              { value: formatJmd(earnings?.totalEarnings), label: 'All time' },
              { value: `${earnings?.totalDeliveries ?? 0}`, label: 'Trips' },
              { value: formatJmd(perDelivery), label: 'Avg / trip' },
            ]}
          />

          <StatGrid>
            <StatCard
              label="Pending payout"
              value={formatJmd(pendingAmount)}
              hint={`${unpaidCount} unpaid ${unpaidCount === 1 ? 'delivery' : 'deliveries'}`}
              icon="hourglass-outline"
              accent="primary"
            />
            <StatCard
              label="Paid out"
              value={formatJmd(paidAmount)}
              hint="Total transferred"
              icon="checkmark-circle-outline"
              accent="partner"
            />
            <StatCard
              label="Total trips"
              value={`${earnings?.totalDeliveries ?? 0}`}
              hint="Completed deliveries"
              icon="navigate-outline"
              accent="default"
            />
          </StatGrid>

          <Pressable
            onPress={() => router.push('/purchase')}
            style={[styles.floatCta, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={[styles.tripIcon, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="wallet-outline" size={18} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.historyId}>Driver float & purchases</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Log fuel / expenses · see expected cash to return
              </ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </Pressable>

          <SectionCard
            title="How you were paid"
            subtitle="Earnings count once the payment is settled">
            <View style={styles.splitRow}>
              <View style={styles.splitCol}>
                <View style={styles.splitHead}>
                  <Ionicons name="cash-outline" size={16} color={theme.primary} />
                  <ThemedText style={styles.splitLabel}>Cash (COD)</ThemedText>
                </View>
                <ThemedText style={styles.splitValue}>{formatJmd(cash?.grossEarnings)}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {cash?.deliveryCount ?? 0} {cash?.deliveryCount === 1 ? 'trip' : 'trips'}
                </ThemedText>
              </View>
              <View style={[styles.splitDivider, { backgroundColor: theme.border }]} />
              <View style={styles.splitCol}>
                <View style={styles.splitHead}>
                  <Ionicons name="card-outline" size={16} color={theme.partner} />
                  <ThemedText style={styles.splitLabel}>Online / bank</ThemedText>
                </View>
                <ThemedText style={styles.splitValue}>{formatJmd(online?.grossEarnings)}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {online?.deliveryCount ?? 0} {online?.deliveryCount === 1 ? 'trip' : 'trips'}
                </ThemedText>
              </View>
            </View>

            {summary?.breakdown ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.splitFooter}>
                {formatJmd(summary.breakdown.deliveryFees)} delivery fees ·{' '}
                {formatJmd(summary.breakdown.tips)} tips
              </ThemedText>
            ) : null}

            {cash?.cashToRemit ? (
              <View style={[styles.noticeRow, { backgroundColor: theme.primarySoft }]}>
                <Ionicons name="wallet-outline" size={16} color={theme.primary} />
                <ThemedText type="small" style={{ color: theme.primary, flex: 1 }}>
                  {formatJmd(cash.cashToRemit)} cash in hand to hand over at shift end
                </ThemedText>
              </View>
            ) : null}

            {awaiting?.grossEarnings ? (
              <View style={[styles.noticeRow, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
                <Ionicons name="time-outline" size={16} color={theme.warning} />
                <ThemedText type="small" style={{ color: theme.warning, flex: 1 }}>
                  {formatJmd(awaiting.grossEarnings)} from {awaiting.deliveryCount}{' '}
                  {awaiting.deliveryCount === 1 ? 'delivery' : 'deliveries'} unlocks once the payment
                  is verified
                </ThemedText>
              </View>
            ) : null}
          </SectionCard>



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

          <SectionCard title="Your purchases" subtitle="Shift purchase requests" noPadding>
            {purchases.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="receipt-outline" size={32} color={theme.textSecondary} />
                <ThemedText style={styles.emptyTitle}>No purchases logged</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptySub}>
                  No purchases logged on this shift yet.
                </ThemedText>
              </View>
            ) : (
              purchases.map((p, i) => (
                <View
                  key={p.id}
                  style={[
                    styles.historyRow,
                    i < purchases.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                  ]}>
                  <View style={[styles.tripIcon, { backgroundColor: theme.primarySoft }]}>
                    <Ionicons name="cart-outline" size={18} color={theme.primary} />
                  </View>
                  <View style={styles.historyLeft}>
                    <ThemedText style={styles.historyId}>
                      {String(p.category).replace(/_/g, ' ')}
                    </ThemedText>
                    {p.note ? (
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                        {p.note}
                      </ThemedText>
                    ) : null}
                    {p.rejectReason ? (
                      <ThemedText type="small" style={{ color: theme.danger }}>
                        {p.rejectReason}
                      </ThemedText>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <ThemedText style={styles.historyEarn}>{formatJmd(p.amount)}</ThemedText>
                    <ThemedText type="small" style={{ color: statusColor(p.status, theme), fontFamily: Fonts.bold }}>
                      {p.status}
                    </ThemedText>
                  </View>
                </View>
              ))
            )}
          </SectionCard>

          {payouts.length > 0 ? (
            <SectionCard title="Payout history" subtitle="Completed transfers" noPadding>
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
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.three,
    borderRadius: Layout.cardRadius,
    paddingVertical: 14,
  },
  withdrawBtnText: {
    color: '#fff',
    fontFamily: Fonts.bold,
    fontSize: 15,
  },
  floatCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Layout.cardRadius,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
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
  splitRow: { flexDirection: 'row', alignItems: 'stretch' },
  splitCol: { flex: 1, gap: 4 },
  splitHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  splitLabel: { fontSize: 12, fontFamily: Fonts.bold },
  splitValue: { fontSize: 18, fontFamily: Fonts.extraBold, marginTop: 2 },
  splitDivider: { width: 1, marginHorizontal: Spacing.two },
  splitFooter: { marginTop: Spacing.three },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
    borderRadius: 12,
    paddingHorizontal: Spacing.two,
    paddingVertical: 10,
  },
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
