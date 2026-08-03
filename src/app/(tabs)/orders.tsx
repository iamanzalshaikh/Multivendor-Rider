import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  View,
  StyleSheet,
  RefreshControl,
  Alert,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

import { ActiveOrderCard } from '@/components/ActiveOrderCard';
import { ScreenHeader } from '@/components/screen-header';
import { RiderTripSkeleton } from '@/components/skeleton';
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
} from '@/services/riders';
import type { RiderOrder } from '@/types/rider';

export default function TripScreen() {
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const tabBarHeight = useTabBarHeight();
  const [refreshing, setRefreshing] = useState(false);
  const {
    rider,
    onlineStatus,
    currentOrderId: activeOrderId,
    refetch: refetchProfile,
    isLoading: profileLoading,
  } = useRiderProfile();

  const activeOrderQ = useRiderOrderCache(activeOrderId);
  useClearStaleActiveTrip(activeOrderId, activeOrderQ.data?.orderStatus);

  const orderStatus = String(activeOrderQ.data?.orderStatus ?? '').toUpperCase();
  const tripEnded =
    orderStatus === 'CANCELLED' ||
    orderStatus === 'COMPLETED' ||
    orderStatus === 'DELIVERED';
  const effectiveActiveId = tripEnded ? undefined : activeOrderId;

  const actionMut = useMutation({
    mutationFn: async ({
      orderId,
      action,
    }: {
      orderId: string;
      action: 'reject' | 'pickup' | 'start' | 'arrived' | 'complete';
    }) => {
      if (action === 'reject') return rejectOrder(orderId);
      if (action === 'pickup') return pickupOrder(orderId);
      if (action === 'start' || action === 'arrived') {
        return markArrived(orderId);
      }
      return completeDelivery(orderId);
    },
    onMutate: async ({ orderId, action }) => {
      const nextStatus = optimisticStatusForAction(action);
      if (!nextStatus) return;
      await qc.cancelQueries({ queryKey: riderKeys.order(orderId) });
      const prev = patchOrderStatusOptimistic(qc, orderId, nextStatus);
      return { prev, orderId };
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.prev && ctx.orderId) {
        qc.setQueryData(riderKeys.order(ctx.orderId), ctx.prev);
      }
      Alert.alert('Action failed', e instanceof Error ? e.message : 'Try again');
    },
    onSuccess: (data, { orderId, action }) => {
      if (data && typeof data === 'object' && '_id' in (data as object)) {
        const updated = data as RiderOrder;
        qc.setQueryData(riderKeys.order(orderId), (prev: RiderOrder | undefined) =>
          prev ? { ...prev, ...updated } : updated,
        );
      }
      if (action === 'complete') {
        invalidateAfterDeliveryComplete(qc, orderId);
      } else {
        invalidateAfterOrderAction(qc, orderId);
      }
    },
  });

  if (profileLoading && !rider) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Active trip" subtitle="Loading…" />
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
        <ThemedText style={styles.emptyTitle}>Go online to see your trip</ThemedText>
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

  if (!effectiveActiveId) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Active trip" subtitle="No delivery in progress" />
        <View style={[styles.emptyBody, { paddingBottom: tabBarHeight }]}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundElement }]}>
            <Ionicons name="navigate-outline" size={44} color={theme.textSecondary} />
          </View>
          <ThemedText style={styles.emptyTitle}>No active trip</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptySub}>
            {tripEnded
              ? 'That delivery ended or was cancelled. Browse Jobs for the next one.'
              : 'Accept a job from the Jobs tab to start a delivery.'}
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
      <ScreenHeader title="Active trip" subtitle="Complete each step to finish delivery" />
      <TabScrollView
        style={styles.flex1}
        contentContainerStyle={{ paddingBottom: tabBarHeight + Spacing.four }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await Promise.all([activeOrderQ.refetch(), refetchProfile()]);
              } finally {
                setRefreshing(false);
              }
            }}
          />
        }>
        {activeOrderQ.isLoading && !activeOrderQ.data ? (
          <RiderTripSkeleton />
        ) : activeOrderQ.data ? (
          <View style={styles.section}>
            <ActiveOrderCard
              order={activeOrderQ.data}
              busy={actionMut.isPending}
              onAction={(action) => actionMut.mutate({ orderId: effectiveActiveId, action })}
            />
          </View>
        ) : null}
      </TabScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex1: { flex: 1 },
  section: { paddingHorizontal: Layout.screenPadding },
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
});
