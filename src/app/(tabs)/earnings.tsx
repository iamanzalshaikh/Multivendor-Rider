import { useMutation, useQueryClient } from '@tanstack/react-query';
import { View, StyleSheet, RefreshControl, Pressable, FlatList, Platform, Modal, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { memo, useCallback, useState } from 'react';

import { RiderEarningsDashboardCard } from '@/components/RiderEarningsDashboardCard';
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
  useRiderEarningsQuery,
  useShiftPurchasesQuery,
  usePastShiftsQuery,
} from '@/hooks/queries/rider';
import { useTheme } from '@/hooks/use-theme';
import { formatJmd, riderEarningForOrder } from '@/lib/money';
import { orderDisplayId } from '@/lib/orderDisplay';
import type { RiderOrder } from '@/types/rider';

function formatDate(value?: string) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
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
const PastShiftRow = memo(function PastShiftRow({
  shift,
  theme,
  onPress,
}: {
  shift: any;
  theme: ReturnType<typeof useTheme>;
  onPress: () => void;
}) {
  const start = new Date(shift.startedAt);
  const dateStr = start.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  
  return (
    <Pressable onPress={onPress} style={{ borderBottomWidth: 1, borderBottomColor: theme.border, padding: Spacing.three, flexDirection: 'row', alignItems: 'center' }}>
      <View style={[styles.tripIcon, { backgroundColor: theme.primarySoft }]}>
        <Ionicons name="time" size={18} color={theme.primary} />
      </View>
      <View style={{ flex: 1, marginHorizontal: 12 }}>
        <ThemedText style={{ fontFamily: Fonts.semiBold, fontSize: 15 }}>Shift on {dateStr}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {shift.deliveriesCompleted} trips · {formatJmd((shift.deliveryFeesCollected ?? 0) + (shift.tipsReceived ?? 0))} earned
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
  const shiftPurchasesQ = useShiftPurchasesQuery(focused);
  const pastShiftsQ = usePastShiftsQuery(focused);

  const earnings = earningsQ.data;
  const summary = summaryQ.data;
  const history = historyQ.data?.orders ?? [];
  const shift = shiftPurchasesQ.data?.shift;
  const pastShifts = pastShiftsQ.data ?? [];
  const refreshing =
    historyQ.isRefetching ||
    earningsQ.isRefetching ||
    summaryQ.isRefetching ||
    pastShiftsQ.isRefetching ||
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
              pastShiftsQ.refetch();
              earningsQ.refetch();
              summaryQ.refetch();
              shiftPurchasesQ.refetch();
            }}
          />
        }>
        <ScreenHeader title="Earnings" subtitle="Float, payouts, and trips" />

        <View style={styles.content}>
          <RiderEarningsDashboardCard
            shift={shift}
            activeOrdersCount={0}
          />

          <SectionCard
            title="Purchases"
            subtitle="Today's logged expenses"
            action={
              <Pressable onPress={() => router.push('/purchase')}>
                <ThemedText type="link" style={{ fontSize: 13 }}>
                  Log Purchase
                </ThemedText>
              </Pressable>
            }
          >
            {shiftPurchasesQ.isLoading ? (
              <ActivityIndicator color={theme.textSecondary} />
            ) : !shiftPurchasesQ.data?.purchases?.length ? (
              <ThemedText type="small" themeColor="textSecondary">
                No purchases logged on this shift.
              </ThemedText>
            ) : (
              shiftPurchasesQ.data.purchases.slice(0, 3).map((p) => (
                <View key={p.id} style={{ flexDirection: 'row', gap: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontFamily: Fonts.semiBold, fontSize: 14, textTransform: 'capitalize' }}>
                      {String(p.category).replace(/_/g, ' ')}
                    </ThemedText>
                    {p.note ? (
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                        {p.note}
                      </ThemedText>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <ThemedText style={{ fontFamily: Fonts.semiBold, fontSize: 14 }}>{formatJmd(p.amount)}</ThemedText>
                    <ThemedText type="small" style={{ color: p.status === 'APPROVED' ? theme.partner : p.status === 'REJECTED' ? theme.danger : theme.warning }}>
                      {p.status}
                    </ThemedText>
                  </View>
                </View>
              ))
            )}
            {shiftPurchasesQ.data?.purchases && shiftPurchasesQ.data.purchases.length > 3 && (
              <Pressable onPress={() => router.push('/purchase')} style={{ paddingTop: 8, alignItems: 'center' }}>
                <ThemedText type="link" style={{ fontSize: 13 }}>View all {shiftPurchasesQ.data.purchases.length} purchases</ThemedText>
              </Pressable>
            )}
          </SectionCard>

          <SectionCard title="Shift History" subtitle="Previous shifts & purchases" noPadding>
            {pastShiftsQ.isLoading ? (
              <View style={{ padding: Spacing.three }}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : pastShifts.length ? (
              <>
                {pastShifts.slice(0, 3).map((s: any) => (
                  <PastShiftRow 
                    key={s.id} 
                    shift={s} 
                    theme={theme} 
                    onPress={() => router.push(`/shift/${s.id}` as never)}
                  />
                ))}
                {pastShifts.length > 3 && (
                  <Pressable onPress={() => router.push('/shift/history' as never)} style={{ paddingTop: Spacing.three, paddingBottom: Spacing.two, alignItems: 'center' }}>
                    <ThemedText type="link" style={{ fontSize: 13 }}>View all {pastShifts.length} past shifts</ThemedText>
                  </Pressable>
                )}
              </>
            ) : (
              <View style={[styles.empty, { padding: Spacing.three }]}>
                <Ionicons name="time-outline" size={32} color={theme.textSecondary} />
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptySub}>
                  No past shifts found.
                </ThemedText>
              </View>
            )}
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: Layout.cardRadius,
    padding: Spacing.four,
    alignItems: 'center',
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Fonts.extraBold,
    marginBottom: Spacing.one,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: Spacing.four,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: Spacing.four,
  },
  currencySymbol: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    marginRight: Spacing.two,
  },
  input: {
    flex: 1,
    height: 56,
    borderWidth: 1,
    borderRadius: Layout.inputRadius,
    paddingHorizontal: Spacing.three,
    fontSize: 24,
    fontFamily: Fonts.bold,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.three,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    height: 50,
    borderRadius: Layout.buttonRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    borderWidth: 1,
  },
  modalButtonConfirm: {
  },
  modalButtonConfirmText: {
    color: '#fff',
    fontFamily: Fonts.bold,
  },
  endShiftBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
  endShiftBtnText: {
    color: '#EF4444',
    fontFamily: Fonts.bold,
    fontSize: 13,
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
