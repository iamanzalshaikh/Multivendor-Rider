import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useRiderOrderChatQuery } from '@/hooks/queries/rider';
import { useRiderProfile } from '@/hooks/use-rider-profile';
import { useTheme } from '@/hooks/use-theme';
import { countUnreadMessages, getChatLastReadAt } from '@/lib/chatRead';

type Props = {
  orderId: string;
  /** Compact icon-only for trip cards; full row for order detail. */
  compact?: boolean;
  /** Chat requires an assigned rider — hide on unclaimed available jobs. */
  enabled?: boolean;
};

export function OrderChatButton({ orderId, compact = false, enabled = true }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const { user, rider } = useRiderProfile();
  const myUserId = user?._id ?? rider?.userId ?? null;
  const chatQ = useRiderOrderChatQuery(orderId, enabled && Boolean(orderId));
  const [lastReadAt, setLastReadAt] = useState(0);

  useEffect(() => {
    let alive = true;
    void getChatLastReadAt(orderId).then((at) => {
      if (alive) setLastReadAt(at);
    });
    return () => {
      alive = false;
    };
  }, [orderId, chatQ.dataUpdatedAt]);

  const unread = useMemo(() => {
    const messages = chatQ.data?.messages ?? [];
    if (!messages.length) return 0;
    return countUnreadMessages(messages, myUserId, lastReadAt);
  }, [chatQ.data?.messages, myUserId, lastReadAt]);

  if (!enabled || !orderId) return null;

  return (
    <Pressable
      onPress={() => router.push(`/order/chat/${orderId}` as never)}
      style={[
        compact ? styles.compactBtn : styles.rowBtn,
        {
          backgroundColor: theme.primarySoft,
          borderColor: theme.border,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={unread > 0 ? `Messages, ${unread} unread` : 'Messages'}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="chatbubble-ellipses" size={compact ? 18 : 18} color={theme.primary} />
        {unread > 0 ? (
          <View style={[styles.badge, { backgroundColor: theme.danger }]}>
            <ThemedText style={styles.badgeText}>{unread > 9 ? '9+' : unread}</ThemedText>
          </View>
        ) : null}
      </View>
      {!compact ? (
        <View style={styles.rowText}>
          <ThemedText style={styles.rowTitle}>Messages</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {unread > 0
              ? `${unread} new from customer`
              : chatQ.data?.messages?.length
                ? 'Open order chat'
                : 'Chat with customer'}
          </ThemedText>
        </View>
      ) : null}
      {!compact ? <Ionicons name="chevron-forward" size={16} color={theme.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  compactBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    marginBottom: Spacing.two,
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: Fonts.extraBold,
    lineHeight: 11,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, fontFamily: Fonts.bold },
});
