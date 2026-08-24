import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  View,
  StyleSheet,
  RefreshControl,
  Alert,
  Pressable,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

import { toast } from '@/lib/toast';


import { ActiveOrderCard } from '@/components/ActiveOrderCard';
import { ScreenHeader } from '@/components/screen-header';
import { RiderTripSkeleton } from '@/components/skeleton';
import { SwipeToConfirm } from '@/components/SwipeToConfirm';
import { TabScrollView } from '@/components/tab-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { useRiderOrderCache } from '@/hooks/queries/rider';
import { invalidateAfterDeliveryComplete, invalidateAfterOrderAction } from '@/lib/riderQueryInvalidation';
import {
  optimisticStatusForAction,
  patchOrderStatusOptimistic,
} from '@/lib/optimisticOrderStatus';
import { useClearStaleActiveTrip } from '@/hooks/use-clear-stale-active-trip';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';
import { useRiderProfile } from '@/hooks/use-rider-profile';
import { useTheme } from '@/hooks/use-theme';
import { riderKeys } from '@/hooks/queries/keys';
import {
  completeDelivery,
  markArrived,
  pickupOrder,
  rejectOrder,
  batchUpdateCaseOrderStatuses,
} from '@/services/riders';
import type { RiderOrder } from '@/types/rider';

function ActiveTripItem({ orderId }: { orderId: string }) {
  const qc = useQueryClient();
  const { activeOrderIds } = useRiderProfile();
  const activeOrderQ = useRiderOrderCache(orderId);
  useClearStaleActiveTrip(orderId, activeOrderQ.data?.orderStatus);

  const actionMut = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: 'reject' | 'pickup' | 'start' | 'arrived' | 'complete';
    }) => {
      if (action === 'reject') return rejectOrder(id);
      if (action === 'pickup') return pickupOrder(id);
      if (action === 'start' || action === 'arrived') {
        return markArrived(id);
      }
      if (action === 'complete') {
        const method = String(activeOrderQ.data?.paymentMethod ?? '').toUpperCase();
        if (method === 'COD') {
          throw new Error('Open Collect & deliver to record cash and get customer confirmation');
        }
      }
      return completeDelivery(id);
    },
    onMutate: async ({ id, action }) => {
      const nextStatus = optimisticStatusForAction(action);
      if (!nextStatus) return;
      await qc.cancelQueries({ queryKey: riderKeys.order(id) });
      const prev = patchOrderStatusOptimistic(qc, id, nextStatus);
      return { prev, id };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.prev && ctx.id) {
        qc.setQueryData(riderKeys.order(ctx.id), ctx.prev);
      }
      Alert.alert('Action failed', e instanceof Error ? e.message : 'Try again');
    },
    onSuccess: (data, { id, action }) => {
      if (data && typeof data === 'object' && '_id' in (data as object)) {
        const updated = data as RiderOrder;
        qc.setQueryData(riderKeys.order(id), (prev: RiderOrder | undefined) =>
          prev ? { ...prev, ...updated } : updated,
        );
      }
      if (action === 'complete') {
        invalidateAfterDeliveryComplete(qc, id);
      } else {
        invalidateAfterOrderAction(qc, id);
      }
    },
  });

  if (activeOrderQ.isLoading && !activeOrderQ.data) {
    return <RiderTripSkeleton />;
  }
  if (!activeOrderQ.data) return null;

  return (
    <View style={styles.section}>
      <ActiveOrderCard
        order={activeOrderQ.data}
        busy={actionMut.isPending}
        onAction={(action) => {
          if (action !== 'complete' && activeOrderIds && activeOrderIds.length > 1) {
            Alert.alert('Batch Update Required', 'You have multiple active orders. Please use the Batch Update button below to update their statuses all at once.');
            return false;
          }
          actionMut.mutate({ id: orderId, action });
        }}
      />
    </View>
  );
}

export default function TripScreen() {
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const tabBarHeight = useTabBarHeight();
  const [refreshing, setRefreshing] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);

  const {
    rider,
    onlineStatus,
    activeOrderIds,
    refetch: refetchProfile,
    isLoading: profileLoading,
  } = useRiderProfile();

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

  if (profileLoading && !rider) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Active trips" subtitle="Loading…" />
        <RiderTripSkeleton />
      </View>
    );
  }

  if (!onlineStatus) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background, paddingBottom: tabBarHeight }]}>
        <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundElement }]}>
          <Ionicons name="cloud-offline-outline" size={44} color={theme.textSecondary} />
        </View>
        <ThemedText style={styles.emptyTitle}>Go online to see your trips</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.emptySub}>
          Turn on availability from Home, then accept a job from the Jobs tab.
        </ThemedText>
        <Pressable
          onPress={() => router.push('/(tabs)')}
          style={[styles.cta, { backgroundColor: theme.primary }]}>
          <ThemedText style={styles.ctaText}>Open Home</ThemedText>
        </Pressable>
      </View>
    );
  }

  if (activeOrderIds.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Active trips" subtitle="No delivery in progress" />
        <View style={[styles.emptyBody, { paddingBottom: tabBarHeight }]}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="navigate-outline" size={44} color={theme.textSecondary} />
          </View>
          <ThemedText style={styles.emptyTitle}>No active trip</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptySub}>
            Accept a job from the Jobs tab to start a delivery.
          </ThemedText>
          <Pressable
            onPress={() => router.push('/(tabs)/jobs')}
            style={[styles.cta, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.ctaText}>Browse delivery jobs</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Active trips" subtitle="Complete each step to finish delivery" />
      <TabScrollView
        style={styles.flex1}
        contentContainerStyle={{ paddingBottom: tabBarHeight + Spacing.four }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await Promise.all([
                  ...activeOrderIds.map(id => qc.refetchQueries({ queryKey: riderKeys.order(id) })),
                  refetchProfile()
                ]);
              } finally {
                setRefreshing(false);
              }
            }}
          />
        }>
        {activeOrderIds.map(id => (
          <ActiveTripItem key={id} orderId={id} />
        ))}
        
        {activeOrderIds.length > 1 && (
          <View style={styles.batchSwipeWrap}>
            <SwipeToConfirm
              label="Swipe to Batch Update"
              busy={batchUpdateMut.isPending}
              disabled={batchUpdateMut.isPending}
              onConfirm={() => {
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
            />
          </View>
        )}
      </TabScrollView>

      <Modal visible={showBatchModal} transparent animationType="fade" onRequestClose={() => setShowBatchModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.modalTitle}>Batch Update Orders</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: Spacing.four, textAlign: 'center' }}>
              Select the new status to apply to ALL your active deliveries.
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
              style={[styles.modalButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowBatchModal(false)}>
              <ThemedText style={{ color: '#fff', fontFamily: Fonts.bold }}>Cancel</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex1: { flex: 1 },
  section: { paddingHorizontal: Layout.screenPadding, marginBottom: Spacing.three },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
  },
  emptyBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Layout.screenPadding,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.extraBold },
  emptySub: { textAlign: 'center', marginTop: Spacing.two, maxWidth: 280, lineHeight: 20 },
  cta: {
    marginTop: Spacing.four,
    borderRadius: Layout.buttonRadius,
    paddingVertical: 14,
    paddingHorizontal: Spacing.four,
  },
  ctaText: { color: '#fff', fontFamily: Fonts.extraBold, fontSize: 15 },
  batchSwipeWrap: {
    marginHorizontal: Layout.screenPadding,
    marginTop: Spacing.two,
    marginBottom: Spacing.five,
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
    borderRadius: 16,
    padding: Spacing.four,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Fonts.extraBold,
    marginBottom: Spacing.two,
  },
  modalButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
});
