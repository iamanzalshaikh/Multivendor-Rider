import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { cardStyle, Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useRiderOrderQuery } from '@/hooks/queries/rider';
import { formatCashDue, formatJmd, formatUsd } from '@/lib/money';
import { enqueueOfflineCashSession } from '@/lib/offlineCashQueue';
import { completeDelivery, createCashPaymentSession } from '@/services/riders';
import { invalidateAfterDeliveryComplete } from '@/lib/riderQueryInvalidation';
import { connectSocket, getSocketInstance } from '@/lib/socketClient';
import { ServerSocketEvents } from '@/lib/socketEvents';

function resolveOrderId(raw: string | string[] | undefined): string | undefined {
  if (!raw) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

export default function RiderPaymentCaptureScreen() {
  const params = useLocalSearchParams<{ orderId: string }>();
  const orderId = resolveOrderId(params.orderId);
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const orderQ = useRiderOrderQuery(orderId);

  const order = orderQ.data;
  const payInUsd = Boolean((order as { payInUsd?: boolean } | undefined)?.payInUsd);

  const cashDue = useMemo(() => {
    if (!order) return 0;
    if (payInUsd) {
      return Number(
        (order as { cashDueUsd?: number }).cashDueUsd ??
          (order as { totalUsd?: number }).totalUsd ??
          0,
      );
    }
    return Number(
      (order as { cashDueAtDelivery?: number }).cashDueAtDelivery ?? order.grandTotal ?? 0,
    );
  }, [order, payInUsd]);

  const [amountReceived, setAmountReceived] = useState('');
  const [waitingConfirm, setWaitingConfirm] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const seededRef = useRef(false);

  useEffect(() => {
    if (cashDue > 0 && !seededRef.current) {
      seededRef.current = true;
      setAmountReceived(payInUsd ? cashDue.toFixed(2) : String(Math.round(cashDue)));
    }
  }, [cashDue, payInUsd]);

  const completeMut = useMutation({
    mutationFn: () => completeDelivery(orderId!),
    onSuccess: () => {
      if (orderId) invalidateAfterDeliveryComplete(qc, orderId);
      router.replace('/(tabs)/orders');
    },
    onError: (e: Error) => Alert.alert('Could not complete', e.message),
  });

  useEffect(() => {
    if (!sessionId) return;
    let alive = true;
    let sock: Awaited<ReturnType<typeof connectSocket>> | null = null;

    const handler = (payload: { id?: string; status?: string }) => {
      if (!alive) return;
      if (payload.id === sessionId) {
        setWaitingConfirm(false);
        completeMut.mutate();
      }
    };

    (async () => {
      try {
        sock = await connectSocket();
        if (!alive) return;
        sock.on(ServerSocketEvents.CASH_SESSION_CONFIRMED, handler);
      } catch {
        /* offline — rider can tap Check if confirmed */
      }
    })();

    return () => {
      alive = false;
      if (sock) sock.off(ServerSocketEvents.CASH_SESSION_CONFIRMED, handler);
      getSocketInstance()?.off(ServerSocketEvents.CASH_SESSION_CONFIRMED, handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only rebind when sessionId changes
  }, [sessionId]);

  const submitMut = useMutation({
    mutationFn: async () => {
      const received = Number(amountReceived);
      if (!orderId || !Number.isFinite(received) || received < 0) {
        throw new Error('Enter a valid amount received');
      }
      const changeReturned = Math.max(0, Math.round((received - cashDue) * 100) / 100);
      const payload = {
        orderId,
        amountReceived: received,
        changeReturned,
      };
      try {
        const session = (await createCashPaymentSession(payload)) as {
          id?: string;
          _id?: string;
        };
        const id = session?.id ?? session?._id ?? null;
        if (!id) throw new Error('Payment session created but no id returned');
        return id;
      } catch (err) {
        const msg = err instanceof Error ? err.message.toLowerCase() : '';
        if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed')) {
          await enqueueOfflineCashSession(payload);
          Alert.alert(
            'Saved offline',
            'Payment recorded locally. It will sync when you are back online. Ask the customer to open their app once you are online.',
          );
          return null;
        }
        throw err;
      }
    },
    onSuccess: (id) => {
      if (!id) return;
      setSessionId(id);
      setWaitingConfirm(true);
      Alert.alert(
        'Sent to customer',
        'Ask the customer to open the CASE app and confirm the cash amount (including any change / wallet credit).',
      );
    },
    onError: (e: Error) => Alert.alert('Failed to record payment', e.message),
  });

  function sendForConfirm() {
    const received = Number(amountReceived);
    if (!Number.isFinite(received) || received < 0) {
      Alert.alert('Invalid amount', 'Enter the cash the customer gave you.');
      return;
    }
    const delta = Math.round((received - cashDue) * 100) / 100;
    const fmt = (n: number) => (payInUsd ? formatUsd(n) : formatJmd(n));

    if (Math.abs(delta) >= (payInUsd ? 1 : 100)) {
      const title = delta > 0 ? 'Large overpayment / change' : 'Large underpayment';
      const body =
        delta > 0
          ? `Customer paid ${fmt(received)} but due is ${fmt(cashDue)}. Extra ${fmt(delta)} will be credited to their wallet after they confirm.`
          : `Customer paid ${fmt(received)} but due is ${fmt(cashDue)}. Shortfall ${fmt(Math.abs(delta))} will debit their wallet after they confirm.`;
      Alert.alert(title, body, [
        { text: 'Edit amount', style: 'cancel' },
        { text: 'Send for confirmation', onPress: () => submitMut.mutate() },
      ]);
      return;
    }
    submitMut.mutate();
  }

  if (!orderId || orderQ.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ThemedText>Order not found</ThemedText>
      </View>
    );
  }

  const received = Number(amountReceived) || 0;
  const walletDeltaDisplay = Math.round((received - cashDue) * 100) / 100;
  const currencyLabel = payInUsd ? 'USD' : 'JMD';
  const fmt = (n: number) => (payInUsd ? formatUsd(n) : formatJmd(n));
  const dangerSoft = 'rgba(239, 68, 68, 0.1)';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.backgroundElement }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Record payment</ThemedText>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.duration(280)}>
          <View style={[styles.heroCard, cardStyle, { backgroundColor: theme.backgroundElement }]}>
            <View style={[styles.heroIcon, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="cash-outline" size={22} color={theme.primary} />
            </View>
            <ThemedText type="label" themeColor="textSecondary" style={styles.heroLabel}>
              Cash due at delivery ({currencyLabel})
            </ThemedText>
            <ThemedText style={[styles.heroAmount, { color: theme.text }]}>{formatCashDue(order as never)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.heroHint}>
              {payInUsd
                ? 'Collect USD cash. Enter the USD amount the customer hands you.'
                : 'Enter the JMD cash the customer hands you. Overpay becomes wallet credit after they confirm.'}
            </ThemedText>
            {Number((order as { walletDeduction?: number }).walletDeduction ?? 0) > 0 ? (
              <View style={[styles.walletChip, { backgroundColor: theme.partnerSoft }]}>
                <Ionicons name="wallet-outline" size={14} color={theme.partner} />
                <ThemedText style={[styles.walletChipText, { color: theme.partner }]}>
                  {formatJmd(Number((order as { walletDeduction?: number }).walletDeduction))} already paid via wallet
                </ThemedText>
              </View>
            ) : null}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(280)}>
          <View style={[styles.inputCard, cardStyle, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.inputLabel}>Amount received ({payInUsd ? 'US$' : 'J$'})</ThemedText>
            <View style={[styles.inputWrap, { borderColor: theme.border, backgroundColor: theme.backgroundSelected }]}>
              <ThemedText style={[styles.currencyPrefix, { color: theme.textSecondary }]}>
                {payInUsd ? 'US$' : 'J$'}
              </ThemedText>
              <TextInput
                value={amountReceived}
                onChangeText={setAmountReceived}
                keyboardType="decimal-pad"
                style={[styles.input, { color: theme.text }]}
                editable={!waitingConfirm && !submitMut.isPending}
                placeholder={payInUsd ? '0.00' : '0'}
                placeholderTextColor={theme.textSecondary}
              />
            </View>
          </View>
        </Animated.View>

        {walletDeltaDisplay > 0 ? (
          <View style={[styles.hint, { backgroundColor: theme.partnerSoft }]}>
            <Ionicons name="add-circle-outline" size={18} color={theme.partner} />
            <ThemedText style={[styles.hintText, { color: theme.partner }]}>
              Overpay {fmt(walletDeltaDisplay)} → customer wallet credit (after they confirm)
            </ThemedText>
          </View>
        ) : walletDeltaDisplay < 0 ? (
          <View style={[styles.hint, { backgroundColor: dangerSoft }]}>
            <Ionicons name="remove-circle-outline" size={18} color={theme.danger} />
            <ThemedText style={[styles.hintText, { color: theme.danger }]}>
              Short {fmt(Math.abs(walletDeltaDisplay))} → customer wallet debit (after they confirm)
            </ThemedText>
          </View>
        ) : null}

        {waitingConfirm ? (
          <View style={[styles.waitBox, cardStyle, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <View style={[styles.waitIcon, { backgroundColor: theme.primarySoft }]}>
              <ActivityIndicator color={theme.primary} />
            </View>
            <ThemedText style={styles.waitTitle}>Waiting for customer</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.waitBody}>
              Ask them to confirm {fmt(received)} on their CASE app (Home / Wallet banner or push notification).
            </ThemedText>
            <Pressable
              style={[styles.secondaryBtn, { borderColor: theme.border }]}
              onPress={() => completeMut.mutate()}
              disabled={completeMut.isPending}
            >
              <ThemedText style={{ fontFamily: Fonts.semiBold }}>Check if confirmed</ThemedText>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.backgroundElement }]}>
        {!waitingConfirm ? (
          <Pressable
            style={[
              styles.primaryBtn,
              { backgroundColor: theme.primary, opacity: submitMut.isPending ? 0.6 : 1 },
            ]}
            disabled={submitMut.isPending}
            onPress={sendForConfirm}
          >
            {submitMut.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send-outline" size={18} color="#fff" />
                <ThemedText style={styles.primaryText}>Send for customer confirmation</ThemedText>
              </>
            )}
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Layout.screenPadding,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: Fonts.extraBold, fontSize: 16 },
  content: { padding: Layout.screenPadding, gap: Spacing.three, paddingBottom: Spacing.five },
  heroCard: { padding: Spacing.three, alignItems: 'center' },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  heroLabel: { textAlign: 'center' },
  heroAmount: { fontSize: 26, fontFamily: Fonts.extraBold, marginTop: 4, textAlign: 'center' },
  heroHint: { marginTop: Spacing.two, textAlign: 'center', lineHeight: 18, paddingHorizontal: Spacing.two },
  walletChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.three,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Layout.inputRadius,
  },
  walletChipText: { fontSize: 12, fontFamily: Fonts.semiBold },
  inputCard: { padding: Spacing.three },
  inputLabel: { fontFamily: Fonts.semiBold, fontSize: 13, marginBottom: Spacing.two },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Layout.inputRadius,
    paddingHorizontal: 14,
    height: 52,
  },
  currencyPrefix: { fontFamily: Fonts.bold, fontSize: 16, marginRight: 6 },
  input: { flex: 1, fontSize: 20, fontFamily: Fonts.extraBold, paddingVertical: 0 },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: Spacing.three,
    borderRadius: Layout.inputRadius,
  },
  hintText: { flex: 1, fontFamily: Fonts.semiBold, fontSize: 13, lineHeight: 18 },
  waitBox: { alignItems: 'center', padding: Spacing.four, gap: Spacing.two },
  waitIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitTitle: { fontFamily: Fonts.bold, fontSize: 15, textAlign: 'center' },
  waitBody: { textAlign: 'center', lineHeight: 18 },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: Layout.buttonRadius,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: Spacing.two,
  },
  footer: { padding: Layout.screenPadding, borderTopWidth: 1 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Layout.buttonRadius,
    paddingVertical: 16,
  },
  primaryText: { color: '#fff', fontFamily: Fonts.bold, fontSize: 15 },
});
