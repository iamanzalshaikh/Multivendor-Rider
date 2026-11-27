import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { useRiderOrderChatQuery, useSendRiderChatMutation } from '@/hooks/queries/rider';
import { useRiderProfile } from '@/hooks/use-rider-profile';
import { useTheme } from '@/hooks/use-theme';
import { markChatRead } from '@/lib/chatRead';
import { toast } from '@/lib/toast';

function resolveOrderId(raw: string | string[] | undefined): string | undefined {
  if (!raw) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

export default function RiderOrderChatScreen() {
  const theme = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId: string }>();
  const orderId = resolveOrderId(params.orderId) ?? '';
  const { user, rider } = useRiderProfile();
  const myUserId = user?._id ?? rider?.userId ?? null;
  const chatQ = useRiderOrderChatQuery(orderId, Boolean(orderId));
  const sendMut = useSendRiderChatMutation(orderId);
  const [text, setText] = useState('');
  const messages = chatQ.data?.messages ?? [];

  useEffect(() => {
    if (!orderId || !messages.length) return;
    void markChatRead(orderId);
  }, [orderId, messages.length, chatQ.dataUpdatedAt]);

  async function send() {
    const body = text.trim();
    if (!body || !orderId) return;
    setText('');
    try {
      await sendMut.mutateAsync(body);
      await markChatRead(orderId);
    } catch (e) {
      setText(body);
      toast.error(e instanceof Error ? e.message : 'Could not send', 'Chat');
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>Order chat</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Customer messages for this trip
          </ThemedText>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        {chatQ.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(m, i) => m.id || String(i)}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="chatbubble-ellipses-outline" size={36} color={theme.textSecondary} />
                <ThemedText style={styles.emptyTitle}>No messages yet</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
                  When the customer sends a note, it will show here.
                </ThemedText>
              </View>
            }
            renderItem={({ item }) => {
              const mine =
                (myUserId && item.senderId === myUserId) ||
                String(item.senderRole ?? '').toUpperCase() === 'RIDER';
              return (
                <View
                  style={[
                    styles.bubble,
                    mine
                      ? { alignSelf: 'flex-end', backgroundColor: theme.primary }
                      : { alignSelf: 'flex-start', backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <ThemedText style={[styles.bubbleText, mine && { color: '#fff' }]}>
                    {item.body}
                  </ThemedText>
                </View>
              );
            }}
          />
        )}

        <View style={[styles.composer, { borderTopColor: theme.border, backgroundColor: theme.backgroundElement }]}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Reply to customer…"
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.background,
                borderColor: theme.border,
              },
            ]}
          />
          <Pressable
            onPress={send}
            disabled={sendMut.isPending || !text.trim()}
            style={[
              styles.send,
              {
                backgroundColor: theme.primary,
                opacity: sendMut.isPending || !text.trim() ? 0.55 : 1,
              },
            ]}
          >
            {sendMut.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={17} color="#fff" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  backBtn: { width: 32 },
  title: { fontSize: 16, fontFamily: Fonts.extraBold },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: Layout.screenPadding, paddingBottom: Spacing.four, flexGrow: 1 },
  empty: {
    marginTop: 80,
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  emptyTitle: { fontSize: 16, fontFamily: Fonts.bold, marginTop: Spacing.two },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    marginBottom: 10,
  },
  bubbleText: { fontSize: 14, fontFamily: Fonts.medium, lineHeight: 20 },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: Spacing.two + 2,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 23,
    fontSize: 14,
    fontFamily: Fonts.medium,
    borderWidth: 1,
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
