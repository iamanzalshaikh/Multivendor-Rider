import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  View,
  StyleSheet,
  RefreshControl,
  Alert,
  FlatList,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';

import { AvailableOrderCard } from '@/components/AvailableOrderCard';
import { ScreenHeader } from '@/components/screen-header';
import { RiderJobsSkeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { useAvailableOrdersQuery } from '@/hooks/queries/rider';
import { invalidateAfterOrderAction } from '@/lib/riderQueryInvalidation';
import { useTabBarHeight } from '@/hooks/use-tab-bar-height';
import { useRiderProfile } from '@/hooks/use-rider-profile';
import { useTheme } from '@/hooks/use-theme';
import { acceptOrder } from '@/services/riders';
import type { RiderOrder } from '@/types/rider';

export default function JobsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const tabBarHeight = useTabBarHeight();
  const { rider, onlineStatus, currentOrderId, isLoading: profileLoading } = useRiderProfile();
  const hasActive = Boolean(currentOrderId);

  const availableQ = useAvailableOrdersQuery(onlineStatus, hasActive);

  const acceptMut = useMutation({
    mutationFn: (orderId: string) => acceptOrder(orderId),
    onSuccess: (_, orderId) => {
      invalidateAfterOrderAction(qc, orderId);
      router.push('/(tabs)/orders');
    },
    onError: (e) => Alert.alert('Could not accept', e instanceof Error ? e.message : 'Try again'),
  });

  const handleAccept = useCallback(
    (orderId: string) => {
      if (!acceptMut.isPending) acceptMut.mutate(orderId);
    },
    [acceptMut],
  );

  const activeOrderId = currentOrderId;
  const available = (availableQ.data ?? []).filter((o) => o._id !== activeOrderId);

  const renderJob = useCallback(
    ({ item }: { item: RiderOrder }) => (
      <AvailableOrderCard
        order={item}
        busy={acceptMut.isPending}
        onAccept={() => handleAccept(item._id)}
      />
    ),
    [acceptMut.isPending, handleAccept],
  );

  if (profileLoading && !rider) {
    return (
      <View style={[styles.root, { backgroundColor: theme.background }]}>
        <ScreenHeader title="Delivery jobs" subtitle="Loading…" />
        <RiderJobsSkeleton />
      </View>
    );
  }

  if (!onlineStatus) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background, paddingBottom: tabBarHeight }]}>
        <View style={[styles.offlineIcon, { backgroundColor: theme.backgroundElement }]}>
          <Ionicons name="cloud-offline-outline" size={40} color={theme.textSecondary} />
        </View>
        <ThemedText style={styles.centerTitle}>Go online first</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centerSub}>
          Turn on online mode from Home — use the toggle at the top of your dashboard.
        </ThemedText>
      </View>
    );
  }

  if (hasActive) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background, paddingBottom: tabBarHeight }]}>
        <View style={[styles.offlineIcon, { backgroundColor: theme.primarySoft }]}>
          <Ionicons name="bicycle" size={40} color={theme.primary} />
        </View>
        <ThemedText style={styles.centerTitle}>Finish current trip</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centerSub}>
          Complete your active delivery before accepting a new job.
        </ThemedText>
        <ThemedText
          type="link"
          onPress={() => router.push('/(tabs)/orders')}
          style={{ marginTop: Spacing.three }}>
          Open active trip →
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Delivery jobs"
        subtitle={
          availableQ.isLoading
            ? 'Loading…'
            : `${available.length} job${available.length === 1 ? '' : 's'} ready to accept`
        }
      />

      <FlatList
        data={available}
        keyExtractor={(item) => item._id}
        renderItem={renderJob}
        style={styles.flex1}
        contentContainerStyle={
          available.length
            ? [styles.list, { paddingBottom: tabBarHeight + Spacing.four }]
            : [styles.listEmpty, { paddingBottom: tabBarHeight }]
        }
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={availableQ.isRefetching} onRefresh={() => availableQ.refetch()} />
        }
        ListEmptyComponent={
          availableQ.isLoading ? (
            <RiderJobsSkeleton />
          ) : (
            <View style={styles.center}>
              <View style={[styles.offlineIcon, { backgroundColor: theme.backgroundElement }]}>
                <Ionicons name="time-outline" size={40} color={theme.textSecondary} />
              </View>
              <ThemedText style={styles.centerTitle}>No jobs right now</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.centerSub}>
                New offers appear when restaurants mark orders ready for pickup.
              </ThemedText>
            </View>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex1: { flex: 1 },
  list: { paddingHorizontal: Layout.screenPadding, paddingTop: Spacing.two },
  listEmpty: { flexGrow: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.five,
    minHeight: 320,
  },
  offlineIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  centerTitle: { fontSize: 18, fontFamily: Fonts.extraBold, textAlign: 'center' },
  centerSub: { textAlign: 'center', marginTop: Spacing.two, maxWidth: 280, lineHeight: 20 },
});
