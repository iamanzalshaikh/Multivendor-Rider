import { useMutation } from '@tanstack/react-query';
import { View, StyleSheet, RefreshControl, ActivityIndicator, Alert, Pressable, FlatList, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { memo, useCallback, useState } from 'react';

import { EarningsHeroCard } from '@/components/EarningsHeroCard';
import { ScreenHeader } from '@/components/screen-header';
import { SectionCard } from '@/components/section-card';
import { StatCard, StatGrid } from '@/components/stat-card';
import { TabScrollView } from '@/components/tab-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import {
  useDeliveryHistoryQuery,
  useEarningsSummaryQuery,
  usePayoutHistoryQuery,
  useRiderEarningsQuery,
  useWithdrawalRequestsQuery,
} from '@/hooks/queries/rider';
import { useTheme } from '@/hooks/use-theme';
import { formatJmd, riderEarningForOrder } from '@/lib/money';
import { orderDisplayId } from '@/lib/orderDisplay';
import { requestWithdrawal } from '@/services/riders';
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
}: {
  item: RiderOrder;
  isLast: boolean;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View
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
    </View>
  );
});

export default function EarningsScreen() {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

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
  const withdrawalsQ = useWithdrawalRequestsQuery(1, 10, focused);

  const withdrawMut = useMutation({
    mutationFn: (amount: number) => requestWithdrawal(amount),
    onSuccess: () => {
      withdrawalsQ.refetch();
      summaryQ.refetch();
      Alert.alert('Withdrawal requested', 'Admin will review your request.');
    },
    onError: (err: Error) => Alert.alert('Withdrawal failed', err.message),
  });

  const earnings = earningsQ.data;
  const summary = summaryQ.data;
  const history = historyQ.data?.orders ?? [];
  const payouts = payoutsQ.data?.payouts ?? [];
  const withdrawals = withdrawalsQ.data?.requests ?? [];
  const pendingAmount = summary?.pendingPayout?.grossEarnings ?? 0;
  const paidAmount = summary?.totalPaidOut?.grossEarnings ?? 0;
  const unpaidCount = summary?.pendingPayout?.deliveryCount ?? 0;
  const availableBalance = withdrawalsQ.data?.availableBalance ?? pendingAmount;
  const perDelivery = summary?.earningPerDelivery ?? 0;
  const cash = summary?.cash;
  const online = summary?.online;
  const awaiting = summary?.awaitingVerification;
  const refreshing =
    historyQ.isRefetching ||
    earningsQ.isRefetching ||
    summaryQ.isRefetching ||
    payoutsQ.isRefetching ||
    withdrawalsQ.isRefetching;

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
              withdrawalsQ.refetch();
            }}
          />
        }>
        <ScreenHeader title="Earnings" subtitle="Track payouts, trips, and withdrawals" />

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
              label="Available"
              value={formatJmd(availableBalance)}
              hint="Ready to withdraw"
              icon="cash-outline"
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

          {availableBalance > 0 ? (
            <Pressable
              style={[styles.withdrawBtn, { backgroundColor: theme.primary }]}
              disabled={withdrawMut.isPending}
              onPress={() => {
                Alert.alert(
                  'Request withdrawal',
                  `Withdraw ${formatJmd(availableBalance)} to your bank account?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Request', onPress: () => withdrawMut.mutate(availableBalance) },
                  ],
                );
              }}>
              {withdrawMut.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="arrow-down-circle-outline" size={20} color="#fff" />
                  <ThemedText style={styles.withdrawBtnText}>
                    Request withdrawal · {formatJmd(availableBalance)}
                  </ThemedText>
                </>
              )}
            </Pressable>
          ) : null}

          <SectionCard title="Recent deliveries" subtitle="Last 30 completed trips" noPadding>
            {historyQ.isLoading ? (
              <ActivityIndicator color={theme.primary} style={{ paddingVertical: Spacing.three }} />
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

          {withdrawals.length > 0 ? (
            <SectionCard title="Withdrawal requests" subtitle="Admin review status" noPadding>
              {withdrawals.map((w, i) => (
                <View
                  key={w._id}
                  style={[
                    styles.historyRow,
                    i < withdrawals.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                  ]}>
                  <View style={[styles.tripIcon, { backgroundColor: theme.primarySoft }]}>
                    <Ionicons name="swap-horizontal-outline" size={18} color={theme.primary} />
                  </View>
                  <View style={styles.historyLeft}>
                    <ThemedText style={styles.historyId}>{formatJmd(w.amount)}</ThemedText>
                    <ThemedText type="small" style={{ color: statusColor(w.status, theme) }}>
                      {formatPayoutStatus(w.status)}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatDate(w.createdAt)}
                  </ThemedText>
                </View>
              ))}
            </SectionCard>
          ) : null}

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
  splitCol: { flex: 1, gap: 2 },
  splitHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  splitLabel: { fontSize: 12, fontFamily: Fonts.bold },
  splitValue: { fontSize: 18, fontFamily: Fonts.extraBold },
  splitDivider: { width: 1, marginHorizontal: Spacing.three },
  splitFooter: { marginTop: Spacing.two },
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
