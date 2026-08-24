import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  Switch,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { EarningsHeroCard } from '@/components/EarningsHeroCard';
import { ScreenHeader } from '@/components/screen-header';
import { SectionCard } from '@/components/section-card';
import { RiderHomeSkeleton, SkeletonBlock } from '@/components/skeleton';
import { StatCard, StatGrid } from '@/components/stat-card';
import { TabScrollView } from '@/components/tab-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { VerificationBanner } from '@/components/verification-banner';
import { cardStyle, Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { toast } from '@/lib/toast';
import { useTheme } from '@/hooks/use-theme';
import { useRiderProfile } from '@/hooks/use-rider-profile';
import {
  useDeliveryHistoryQuery,
  useEarningsSummaryQuery,
  useRiderEarningsQuery,
  useRiderOrderCache,
  useShiftPurchasesQuery,
  prefetchRiderOrder,
} from '@/hooks/queries/rider';
import { riderKeys } from '@/hooks/queries/keys';
import { invalidateAvailableOrders, invalidateRiderProfile } from '@/lib/riderQueryInvalidation';
import { useUnreadNotificationCount } from '@/hooks/use-unread-notifications';
import { hasUploadedImage } from '@/lib/imageUtils';
import { emitRiderOnlineStatus } from '@/lib/riderSocketActions';
import { formatJmd, riderEarningForOrder } from '@/lib/money';
import { countPendingCashSessions, syncPendingCashSessions } from '@/lib/offlineCashQueue';
import { batchUpdateCaseOrderStatuses, updateRiderOnlineStatus } from '@/services/riders';
import { useRiderStore } from '@/stores/riderStore';
import type { VerificationStatus, RiderProfile, RiderOrder } from '@/types/rider';

function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
      {action}
    </View>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const rider = useRiderStore((s) => s.rider);
  const setRider = useRiderStore((s) => s.setRider);
  const unreadCount = useUnreadNotificationCount();

  const {
    rider: profileRider,
    user,
    onlineStatus,
    verificationStatus,
    refetch: refetchProfile,
  } = useRiderProfile();

  const earningsQ = useRiderEarningsQuery();
  const summaryQ = useEarningsSummaryQuery();
  const historyQ = useDeliveryHistoryQuery(1, 5, true);
  const shiftQ = useShiftPurchasesQuery(true);
  const [pendingSync, setPendingSync] = useState(0);
  const [showBatchModal, setShowBatchModal] = useState(false);

  useEffect(() => {
    void (async () => {
      await syncPendingCashSessions();
      setPendingSync(await countPendingCashSessions());
    })();
  }, []);

  const currentRider = profileRider ?? rider;
  const profileImage = user?.profileImage ?? profileRider?.profileImage;
  const activeOrderIds = currentRider?.activeOrderIds ?? (currentRider?.currentOrderId ? [currentRider.currentOrderId] : []);
  const isApproved = verificationStatus === 'approved';

  useEffect(() => {
    activeOrderIds.forEach(id => prefetchRiderOrder(qc, id));
  }, [activeOrderIds, qc]);

  const onlineMut = useMutation({
    mutationFn: (online: boolean) => updateRiderOnlineStatus(online),
    onSuccess: (updated) => {
      setRider(updated);
      void emitRiderOnlineStatus(updated.onlineStatus);
      invalidateRiderProfile(qc);
      invalidateAvailableOrders(qc);
    },
    onError: (e) => {
      if (e instanceof Error && e.message === 'SHIFT_REQUIRED') {
        toast.warning('Only admin can start your shift. Please contact admin.', 'Shift Required');
      } else {
        toast.error(e instanceof Error ? e.message : 'Try again', 'Could not update status');
      }
    },
  });

  const batchUpdateMut = useMutation({
    mutationFn: (status: string) => batchUpdateCaseOrderStatuses(status),
    onSuccess: () => {
      toast.success('Successfully updated all active deliveries.');
      setShowBatchModal(false);
      activeOrderIds.forEach(id => {
        qc.invalidateQueries({ queryKey: riderKeys.order(id) });
      });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Try again', 'Update Failed');
    },
  });

  const earnings = earningsQ.data;
  const summary = summaryQ.data;
  const online = onlineStatus;
  const shift = shiftQ.data?.shift;
  const refreshing =
    earningsQ.isRefetching ||
    summaryQ.isRefetching ||
    historyQ.isRefetching ||
    shiftQ.isRefetching;

  const fullName = user?.fullName ?? '';
  const greeting = fullName
    ? `Hi, ${fullName.split(' ')[0]}`
    : currentRider?.riderCode
      ? `Hi, ${currentRider.riderCode.split('-')[1] ?? currentRider.riderCode}`
      : 'Hi, Partner';

  const rating = currentRider?.averageRating?.toFixed(1) ?? '0.0';
  const openActiveOrder = useCallback(() => {
    router.push('/(tabs)/orders' as never);
  }, [router]);

  const homeLoading =
    (!currentRider && (earningsQ.isLoading || summaryQ.isLoading)) ||
    (earningsQ.isLoading && summaryQ.isLoading && !earningsQ.data && !summaryQ.data);

  if (homeLoading && !currentRider) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Partner" subtitle="Loading your dashboard…" />
        <RiderHomeSkeleton />
      </View>
    );
  }

  return (
    <TabScrollView
      style={[styles.root, { backgroundColor: theme.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            refetchProfile();
            earningsQ.refetch();
            summaryQ.refetch();
            historyQ.refetch();
            shiftQ.refetch();
          }}
        />
      }>
      <ScreenHeader
        title={greeting}
        subtitle="Your delivery dashboard"
        right={
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => router.push('/notifications' as never)}
              style={[styles.iconCircle, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
              hitSlop={8}>
              <Ionicons name="notifications-outline" size={20} color={theme.text} />
              {unreadCount > 0 ? (
                <View style={[styles.bellBadge, { backgroundColor: theme.primary }]}>
                  <ThemedText style={styles.bellBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </ThemedText>
                </View>
              ) : null}
            </Pressable>

            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: online ? theme.partnerSoft : theme.backgroundElement,
                  borderColor: online ? theme.partner : theme.border,
                },
              ]}>
              <View style={[styles.statusDot, { backgroundColor: online ? theme.partner : theme.textSecondary }]} />
              <ThemedText style={[styles.statusPillText, { color: online ? theme.partner : theme.textSecondary }]}>
                {online ? 'Online' : 'Offline'}
              </ThemedText>
            </View>

            <Pressable onPress={() => router.push('/(tabs)/profile')} hitSlop={8}>
              {hasUploadedImage(profileImage) ? (
                <Image source={{ uri: profileImage! }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.primarySoft }]}>
                  <Ionicons name="person" size={18} color={theme.primary} />
                </View>
              )}
            </Pressable>
          </View>
        }
      />

      <View style={styles.content}>
        <Pressable
          disabled={!isApproved || onlineMut.isPending}
          onPress={() => {
            if (isApproved && !onlineMut.isPending) onlineMut.mutate(!online);
          }}
          style={[
            styles.onlineCard,
            cardStyle,
            {
              backgroundColor: online ? theme.partnerSoft : theme.backgroundElement,
              borderColor: online ? theme.partner : theme.border,
            },
          ]}>
          <View style={styles.onlineCardLeft}>
            <View
              style={[
                styles.onlineIconWrap,
                { backgroundColor: online ? theme.partner : theme.backgroundSelected },
              ]}>
              <Ionicons
                name={online ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={online ? '#fff' : theme.textSecondary}
              />
            </View>
            <View style={styles.flex1}>
              <ThemedText style={styles.onlineCardTitle}>
                {online ? 'You are online' : 'You are offline'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.cardSub}>
                {!isApproved
                  ? 'Available after admin approves your account'
                  : online
                    ? 'Receiving delivery jobs near you'
                    : 'Tap to go online and accept deliveries'}
              </ThemedText>
            </View>
          </View>
          {onlineMut.isPending ? (
            <ActivityIndicator color={theme.partner} />
          ) : (
            <Switch
              value={online}
              disabled={!isApproved}
              onValueChange={(v) => onlineMut.mutate(v)}
              trackColor={{ false: theme.border, true: theme.partner }}
              thumbColor="#fff"
              ios_backgroundColor={theme.border}
            />
          )}
        </Pressable>

        <VerificationBanner status={verificationStatus as VerificationStatus} />

        {pendingSync > 0 ? (
          <View style={[styles.syncBanner, { backgroundColor: theme.warningSoft, borderColor: theme.warning }]}>
            <Ionicons name="cloud-upload-outline" size={18} color={theme.warning} />
            <ThemedText style={{ flex: 1, color: theme.warning }}>
              {pendingSync} offline payment{pendingSync > 1 ? 's' : ''} pending sync
            </ThemedText>
          </View>
        ) : null}

        <EarningsHeroCard
          todayAmount={earnings?.todayEarnings ?? 0}
          icon="wallet"
          meta={[
            { value: formatJmd(earnings?.totalEarnings), label: 'All time' },
            { value: earnings?.totalDeliveries?.toString() ?? '0', label: 'Trips' },
          ]}
        />
        
        {shift ? (
          <View style={[styles.floatCard, cardStyle, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.floatRow}>
              <View style={styles.floatCol}>
                <ThemedText type="small" themeColor="textSecondary">Opening float</ThemedText>
                <ThemedText style={[styles.floatValue, { color: theme.text }]}>{formatJmd(shift.floatIssued)}</ThemedText>
              </View>
              <View style={styles.floatCol}>
                <ThemedText type="small" themeColor="textSecondary">Owe to Admin</ThemedText>
                <ThemedText style={[styles.floatValue, { color: theme.danger }]}>{formatJmd(shift.expectedCashReturn)}</ThemedText>
              </View>
            </View>
          </View>
        ) : null}

        {activeOrderIds.length > 0 ? (
          <View style={styles.section}>
            <SectionHeader
              title="Active deliveries"
              action={
                <Pressable onPress={openActiveOrder}>
                  <ThemedText type="link">Open</ThemedText>
                </Pressable>
              }
            />
            <Pressable
              onPress={openActiveOrder}
              style={[styles.activeBanner, cardStyle, { backgroundColor: theme.primarySoft }]}>
              <View style={styles.activeTop}>
                <ThemedText style={styles.activeOrderId}>
                  {activeOrderIds.length} Active {activeOrderIds.length === 1 ? 'Delivery' : 'Deliveries'}
                </ThemedText>
              </View>
              <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 6 }}>
                Tap to manage your active deliveries.
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => {
                const orders = activeOrderIds.map(id => qc.getQueryData<RiderOrder>(riderKeys.order(id))).filter(Boolean);
                
                if (orders.length === 0 && activeOrderIds.length > 0) {
                  toast.info('Loading orders, please wait...');
                  return;
                }

                const allArrived = orders.every(o => {
                  const s = String(o?.orderStatus).toUpperCase();
                  return s === 'ARRIVED' || s === 'DELIVERED' || s === 'COMPLETED';
                });
                
                if (allArrived) {
                  Alert.alert(
                    'Batch Update Complete',
                    'All active orders have already arrived. Please confirm delivery individually at each customer location.'
                  );
                  return;
                }
                setShowBatchModal(true);
              }}
              style={[
                styles.cta,
                { backgroundColor: theme.primary, opacity: batchUpdateMut.isPending ? 0.55 : 1, marginTop: Spacing.two },
              ]}
              disabled={batchUpdateMut.isPending}>
              <ThemedText style={styles.ctaText}>
                {batchUpdateMut.isPending ? 'Updating...' : 'Update All Statuses'}
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        <SectionCard
          title="Recent deliveries"
          subtitle="Last 5 completed trips"
          action={
            <Pressable onPress={() => router.push('/(tabs)/earnings')}>
              <ThemedText type="link">See all</ThemedText>
            </Pressable>
          }
          noPadding>
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
          ) : (historyQ.data?.orders ?? []).length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              No completed deliveries yet. Go online and accept your first order.
            </ThemedText>
          ) : (
            (historyQ.data?.orders ?? []).map((o, i, arr) => (
              <Pressable
                key={o._id}
                onPressIn={() => prefetchRiderOrder(qc, o._id)}
                onPress={() => router.push(`/order/${o._id}` as never)}
                style={[
                  styles.listRow,
                  i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                ]}>
                <View style={[styles.tripIcon, { backgroundColor: theme.partnerSoft }]}>
                  <Ionicons name="bicycle" size={16} color={theme.partner} />
                </View>
                <View style={styles.flex1}>
                  <ThemedText style={styles.listPrimary}>
                    #{o.orderNumber ?? o._id.slice(-6).toUpperCase()}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {typeof o.restaurantId === 'object'
                      ? o.restaurantId?.restaurantName ?? 'Restaurant'
                      : 'Restaurant'}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.listAmount, { color: theme.partner }]}>
                  +{formatJmd(riderEarningForOrder(o))}
                </ThemedText>
                <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
              </Pressable>
            ))
          )}
        </SectionCard>

        <Pressable
          onPress={() => router.push(activeOrderIds.length > 0 ? '/(tabs)/orders' : '/(tabs)/jobs')}
          style={[styles.cta, { backgroundColor: theme.primary, opacity: isApproved ? 1 : 0.55 }]}
          disabled={!isApproved}>
          <ThemedText style={styles.ctaText}>
            {!isApproved
              ? 'Waiting for admin approval'
              : !online
                ? 'Go online to see jobs'
                : activeOrderIds.length > 0
                  ? 'Continue active trips'
                  : 'Browse delivery jobs'}
          </ThemedText>
        </Pressable>
      </View>

      <Modal visible={showBatchModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundElement }]}>
            <View style={[styles.modalIconWrap, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="list" size={28} color={theme.primary} />
            </View>
            <ThemedText style={styles.modalTitle}>Batch Update</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.modalSubtitle}>
              Update the status of all your active deliveries at once.
            </ThemedText>

            <View style={{ width: '100%', gap: Spacing.two, marginBottom: Spacing.four }}>
              {['ON_THE_WAY', 'ARRIVED'].map((status) => (
                <Pressable
                  key={status}
                  style={[styles.modalButton, styles.modalButtonCancel, { borderColor: theme.border, marginBottom: 8 }]}
                  onPress={() => batchUpdateMut.mutate(status)}>
                  <ThemedText style={{ fontFamily: Fonts.bold }}>
                    {status.replace(/_/g, ' ')}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[styles.modalButton, styles.modalButtonConfirm, { backgroundColor: theme.textSecondary }]}
              onPress={() => setShowBatchModal(false)}>
              <ThemedText style={styles.modalButtonConfirmText}>Cancel</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </TabScrollView>
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
  flex1: { flex: 1 },
  onlineCard: {
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: Spacing.two,
  },
  onlineCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  onlineIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineCardTitle: { fontSize: 16, fontFamily: Fonts.extraBold },
  card: {
    marginTop: Spacing.three,
    marginBottom: Spacing.two,
    padding: Spacing.three,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  cardTitle: { fontSize: 15, fontFamily: Fonts.extraBold },
  cardSub: { marginTop: 4 },
  heroCard: {
    borderRadius: Layout.cardRadius,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  heroAmount: {
    color: '#fff',
    fontSize: 34,
    fontFamily: Fonts.extraBold,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: Spacing.three,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroMetaItem: { flex: 1, alignItems: 'center' },
  heroMetaDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  heroMetaValue: {
    color: '#fff',
    fontSize: 16,
    fontFamily: Fonts.extraBold,
  },
  heroMetaLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { fontSize: 11, fontFamily: Fonts.bold, textTransform: 'uppercase' },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: Fonts.bold,
    lineHeight: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  sectionTitle: { fontSize: 14, fontFamily: Fonts.extraBold },
  floatCard: {
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.three,
  },
  floatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  floatTitle: { fontSize: 14, fontFamily: Fonts.extraBold },
  floatRow: { flexDirection: 'row', gap: Spacing.two },
  floatCol: { flex: 1, gap: 2 },
  floatValue: { fontSize: 15, fontFamily: Fonts.extraBold },
  activeBanner: { padding: Spacing.three },
  activeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  activeOrderId: { fontSize: 18, fontFamily: Fonts.extraBold },
  activeBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  activeBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    gap: Spacing.two,
  },
  tripIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listPrimary: { fontSize: 13, fontFamily: Fonts.bold },
  listAmount: { fontSize: 14, fontFamily: Fonts.extraBold },
  emptyText: { padding: Spacing.three, textAlign: 'center' },
  cta: {
    marginTop: Spacing.one,
    borderRadius: Layout.buttonRadius,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontFamily: Fonts.extraBold, fontSize: 15 },
});
