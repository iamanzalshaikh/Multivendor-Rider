import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ActiveOrderCard } from '@/components/ActiveOrderCard';
import { ScreenHeader } from '@/components/screen-header';
import { TabScrollView } from '@/components/tab-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { useRiderOrderCache } from '@/hooks/queries/rider';
import { invalidateAfterDeliveryComplete, invalidateAfterOrderAction } from '@/lib/riderQueryInvalidation';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';
import { useRiderProfile } from '@/hooks/use-rider-profile';
import { useTheme } from '@/hooks/use-theme';
import {
  completeDelivery,
  markArrived,
  pickupOrder,
  rejectOrder,
} from '@/services/riders';

export default function TripScreen() {
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const tabBarHeight = useTabBarHeight();
  const { rider, onlineStatus, currentOrderId: activeOrderId, refetch: refetchProfile, isLoading: profileLoading } =
    useRiderProfile();

  const activeOrderQ = useRiderOrderCache(activeOrderId);

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
    onSuccess: (_, { orderId, action }) => {
      if (action === 'complete') {
        invalidateAfterDeliveryComplete(qc, orderId);
      } else {
        invalidateAfterOrderAction(qc, orderId);
      }
    },
    onError: (e) => Alert.alert('Action failed', e instanceof Error ? e.message : 'Try again'),
  });

  if (profileLoading && !rider) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background, paddingBottom: tabBarHeight }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!onlineStatus) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background, paddingBottom: tabBarHeight }]}>
        <Ionicons name="cloud-offline-outline" size={48} color={theme.textSecondary} />
        <ThemedText style={styles.emptyTitle}>You are offline</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.emptySub}>
          Use the online toggle on Home to start delivering.
        </ThemedText>
      </View>
    );
  }

  if (!activeOrderId) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Active trip" subtitle="No delivery in progress" />
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
      <ScreenHeader title="Active trip" subtitle="Complete each step below" />

      <TabScrollView
        style={styles.flex1}
        refreshControl={
          <RefreshControl
            refreshing={activeOrderQ.isRefetching}
            onRefresh={() => {
              activeOrderQ.refetch();
              refetchProfile();
            }}
          />
        }>
        {activeOrderQ.isLoading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: Spacing.four }} />
        ) : activeOrderQ.data ? (
          <View style={styles.section}>
            <ActiveOrderCard
              order={activeOrderQ.data}
              busy={actionMut.isPending}
              onAction={(action) => actionMut.mutate({ orderId: activeOrderId, action })}
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.five },
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
