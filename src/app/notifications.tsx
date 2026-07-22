import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback } from 'react';

import { ThemedText } from '@/components/themed-text';
import { cardStyle, Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { notificationKeys } from '@/hooks/queries/keys';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/services/notifications';

function formatTimeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const NotificationRow = memo(function NotificationRow({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: () => void;
}) {
  const theme = useTheme();
  const isOrder = item.notificationType === 'ORDER';

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        !item.isRead && { backgroundColor: `${theme.primary}08` },
        { borderBottomColor: theme.border },
      ]}>
      <View style={[styles.iconWrap, { backgroundColor: isOrder ? theme.primarySoft : theme.background }]}>
        <Ionicons
          name={isOrder ? 'bicycle' : 'notifications-outline'}
          size={20}
          color={isOrder ? theme.primary : theme.textSecondary}
        />
      </View>
      <View style={styles.rowBody}>
        <ThemedText style={[styles.rowTitle, !item.isRead && styles.unreadTitle]}>{item.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {item.message}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.time}>
          {formatTimeAgo(item.sentAt)}
        </ThemedText>
      </View>
      {!item.isRead ? <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} /> : null}
    </Pressable>
  );
});

export default function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();

  const listQ = useQuery({
    queryKey: notificationKeys.list(1),
    queryFn: () => fetchNotifications(1, 50),
    staleTime: 60_000,
    refetchOnMount: false,
  });

  const readMut = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const readAllMut = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const notifications = listQ.data?.notifications ?? [];
  const unread = notifications.filter((n) => !n.isRead).length;

  const onOpen = useCallback(
    (item: AppNotification) => {
      if (!item.isRead) readMut.mutate(item._id);
      if (item.redirectType === 'ORDER' && item.redirectId) {
        router.push(`/order/${item.redirectId}` as never);
      }
    },
    [readMut, router],
  );

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => (
      <NotificationRow item={item} onPress={() => onOpen(item)} />
    ),
    [onOpen],
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Notifications</ThemedText>
        {unread > 0 ? (
          <Pressable onPress={() => readAllMut.mutate()} disabled={readAllMut.isPending}>
            <ThemedText type="link" style={{ fontSize: 13 }}>
              Mark all read
            </ThemedText>
          </Pressable>
        ) : (
          <View style={{ width: 72 }} />
        )}
      </View>

      {listQ.isLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: Spacing.five }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl refreshing={listQ.isRefetching} onRefresh={() => listQ.refetch()} />
          }
          contentContainerStyle={notifications.length ? undefined : styles.emptyWrap}
          ListEmptyComponent={
            <View style={[styles.empty, cardStyle, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="notifications-off-outline" size={40} color={theme.textSecondary} />
              <ThemedText style={styles.emptyTitle}>All caught up</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                New delivery alerts and updates will show here.
              </ThemedText>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: Spacing.two,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: Spacing.two,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1 },
  rowTitle: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    marginBottom: 2,
  },
  unreadTitle: {
    fontFamily: Fonts.bold,
  },
  time: { marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  emptyWrap: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Layout.screenPadding,
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
});
