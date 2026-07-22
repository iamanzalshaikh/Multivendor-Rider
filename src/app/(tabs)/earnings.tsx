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
import { orderDisplayId } from '@/lib/orderDisplay';
import { requestWithdrawal, RIDER_FEE } from '@/services/riders';
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
      <ThemedText style={[styles.historyEarn, { color: theme.partner }]}>+₹{RIDER_FEE}</ThemedText>
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
  const perDelivery = summary?.earningPerDelivery ?? RIDER_FEE;
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
              { value: `₹${earnings?.totalEarnings ?? 0}`, label: 'All time' },
              { value: `${earnings?.totalDeliveries ?? 0}`, label: 'Trips' },
              { value: `₹${perDelivery}`, label: 'Per trip' },
            ]}
          />

          <StatGrid>
            <StatCard
              label="Pending payout"
              value={`₹${pendingAmount}`}
              hint={`${unpaidCount} unpaid ${unpaidCount === 1 ? 'delivery' : 'deliveries'}`}
              icon="hourglass-outline"
              accent="primary"
            />
            <StatCard
              label="Paid out"
              value={`₹${paidAmount}`}
              hint="Total transferred"
              icon="checkmark-circle-outline"
              accent="partner"
            />
            <StatCard
              label="Available"
              value={`₹${availableBalance}`}
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

          {availableBalance > 0 ? (
            <Pressable
              style={[styles.withdrawBtn, { backgroundColor: theme.primary }]}
              disabled={withdrawMut.isPending}
              onPress={() => {
                Alert.alert(
                  'Request withdrawal',
                  `Withdraw ₹${availableBalance} to your bank account?`,
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
                  <ThemedText style={styles.withdrawBtnText}>Request withdrawal · ₹{availableBalance}</ThemedText>
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
                    <ThemedText style={styles.historyId}>₹{w.amount}</ThemedText>
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
                    <ThemedText style={styles.historyId}>₹{p.netPayable ?? p.amount ?? 0}</ThemedText>
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
