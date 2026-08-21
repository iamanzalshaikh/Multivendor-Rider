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
import { Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { notificationKeys } from '@/hooks/queries/keys';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '@/services/notifications';

function formatTimeAgo(value: string | undefined) {
  if (!value) return 'Just now';
  const time = new Date(value).getTime();
  if (isNaN(time)) return 'Just now';
  const diff = Date.now() - time;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const NotificationCard = memo(function NotificationCard({
  item,
  onPress,
}: {
  item: AppNotification;
  onPress: () => void;
}) {
  const theme = useTheme();
  const isOrder = item.notificationType === 'ORDER';
  
  // Backend often returns createdAt instead of sentAt depending on schema
  const timestamp = item.createdAt || item.sentAt;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, shadowColor: theme.text },
        pressed && { opacity: 0.8 }
      ]}
    >
      {!item.isRead && (
        <View style={[styles.unreadAccent, { backgroundColor: theme.primary }]} />
      )}
      
      <View style={styles.cardContent}>
        <View style={[styles.iconWrap, { backgroundColor: isOrder ? theme.primarySoft : `${theme.textSecondary}15` }]}>
          <Ionicons
            name={isOrder ? 'bicycle' : 'notifications-outline'}
            size={22}
            color={isOrder ? theme.primary : theme.text}
          />
        </View>
        
        <View style={styles.rowBody}>
          <View style={styles.headerRow}>
            <ThemedText style={[styles.rowTitle, !item.isRead && styles.unreadTitle]} numberOfLines={1}>
              {item.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.time}>
              {formatTimeAgo(timestamp)}
            </ThemedText>
          </View>
          <ThemedText style={styles.messageText} themeColor="textSecondary" numberOfLines={2}>
            {item.message}
          </ThemedText>
        </View>
      </View>
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
      <NotificationCard item={item} onPress={() => onOpen(item)} />
    ),
    [onOpen],
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Notifications</ThemedText>
        {unread > 0 ? (
          <Pressable onPress={() => readAllMut.mutate()} disabled={readAllMut.isPending} hitSlop={8}>
            <ThemedText type="link" style={{ fontSize: 13, fontFamily: Fonts.bold }}>
              Mark all read
            </ThemedText>
          </Pressable>
        ) : (
          <View style={{ width: 85 }} />
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
          contentContainerStyle={[styles.listContainer, notifications.length === 0 && styles.emptyWrap]}
          ListEmptyComponent={
            <View style={[styles.empty, { backgroundColor: theme.backgroundElement }]}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="notifications-off-outline" size={32} color={theme.textSecondary} />
              </View>
              <ThemedText style={styles.emptyTitle}>All caught up</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyDesc}>
                New delivery alerts and important updates will appear here.
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
    paddingVertical: Spacing.three,
    marginBottom: Spacing.two,
  },
  backBtn: {
    width: 32,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  listContainer: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Layout.safeAreaBottom + 20,
    gap: Spacing.three,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  unreadAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.three,
    paddingLeft: Spacing.four,
    gap: Spacing.three,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { 
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  rowTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    marginRight: 8,
  },
  unreadTitle: {
    fontFamily: Fonts.bold,
  },
  time: { 
    fontFamily: Fonts.medium,
    fontSize: 11,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyWrap: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    padding: Spacing.five,
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: Spacing.four,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(150,150,150,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
  },
  emptyDesc: {
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: Spacing.two,
  },
});
