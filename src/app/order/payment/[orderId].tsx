import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { dialog } from '@/lib/dialog';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { cardStyle, Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useRiderOrderQuery } from '@/hooks/queries/rider';
import { formatCashDue, formatJmd, formatUsd } from '@/lib/money';
import { enqueueOfflineCashSession } from '@/lib/offlineCashQueue';
import {
  completeDelivery,
  createCashPaymentSession,
  fetchCashSessionByOrder,
  remindCashPaymentSession,
} from '@/services/riders';
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
  const deferredFee = Boolean(
    (order as { deliveryFeeDeferred?: boolean } | undefined)?.deliveryFeeDeferred ||
      (order as { settlement?: { deliveryFeeDeferred?: boolean } } | undefined)?.settlement
        ?.deliveryFeeDeferred,
  );
  const isCod = String(order?.paymentMethod ?? '').toUpperCase() === 'COD';

  const baseCashDue = useMemo(() => {
    if (!order) return 0;
    if (deferredFee && !isCod) {
      // Prepaid Get Anything — the customer pays the rider delivery fee, plus any amount
      // the goods cost over the agreed budget (recorded at purchase).
      return Number(
        (order as { settlement?: { getAnything?: { extraDueFromCustomer?: number } } }).settlement
          ?.getAnything?.extraDueFromCustomer ?? 0,
      );
    }
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
  }, [order, payInUsd, deferredFee, isCod]);

  const [deliveryFeeInput, setDeliveryFeeInput] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [waitingConfirm, setWaitingConfirm] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [checkingConfirm, setCheckingConfirm] = useState(false);
  const [resending, setResending] = useState(false);
  const seededRef = useRef(false);
  const feeSeededRef = useRef(false);
  const completingRef = useRef(false);

  const deliveryFeeNum = deferredFee ? Number(deliveryFeeInput) || 0 : 0;
  const cashDue = useMemo(() => {
    if (!deferredFee) return baseCashDue;
    // USD Get Anything is rare; fee is always entered in JMD and cash due stays JMD when deferred.
    return Math.round((baseCashDue + deliveryFeeNum) * 100) / 100;
  }, [baseCashDue, deferredFee, deliveryFeeNum]);

  // Resume pending confirmation if rider backed out and reopened this screen.
  // Poll while waiting so confirmation is noticed even if the socket drops.
  const existingSessionQ = useQuery({
    queryKey: ['cash-session-by-order', orderId],
    queryFn: () => fetchCashSessionByOrder(orderId!),
    enabled: Boolean(orderId),
    staleTime: 5_000,
    retry: 1,
    refetchInterval: waitingConfirm ? 5_000 : false,
  });

  const completeMut = useMutation({
    mutationFn: () => completeDelivery(orderId!),
    onSuccess: () => {
      if (orderId) invalidateAfterDeliveryComplete(qc, orderId);
      router.replace('/(tabs)/orders');
    },
    onError: (e: Error) => {
      completingRef.current = false;
      dialog.alert('Could not complete', e.message);
    },
  });

  function finishAfterCustomerConfirm(source: 'socket' | 'poll' | 'check' | 'resume') {
    if (completingRef.current || completeMut.isPending) return;
    completingRef.current = true;
    setWaitingConfirm(false);
    if (source === 'check' || source === 'resume') {
      dialog.alert('Confirmed', 'Customer confirmed — completing delivery.');
    }
    completeMut.mutate();
  }

  useEffect(() => {
    const s = existingSessionQ.data as
      | { id?: string; status?: string; amountReceived?: number }
      | null
      | undefined;
    if (!s?.id) return;
    if (s.status === 'CONFIRMED') {
      finishAfterCustomerConfirm(waitingConfirm ? 'poll' : 'resume');
      return;
    }
    if (s.status === 'PENDING_CUSTOMER') {
      setSessionId(String(s.id));
      setWaitingConfirm(true);
      if (s.amountReceived != null && Number.isFinite(Number(s.amountReceived))) {
        setAmountReceived(
          payInUsd ? Number(s.amountReceived).toFixed(2) : String(Math.round(Number(s.amountReceived))),
        );
        seededRef.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingSessionQ.data, payInUsd]);

  useEffect(() => {
    if (!deferredFee || feeSeededRef.current || !order) return;
    const pending = Number(
      (order as { settlement?: { pendingDeliveryFee?: number | null } }).settlement
        ?.pendingDeliveryFee ?? 0,
    );
    const existing = Number(order.deliveryFee ?? 0);
    const seed = pending > 0 ? pending : existing > 0 ? existing : 0;
    if (seed > 0) {
      feeSeededRef.current = true;
      setDeliveryFeeInput(String(Math.round(seed)));
    }
  }, [deferredFee, order]);

  useEffect(() => {
    if (waitingConfirm) return;
    if (cashDue > 0 && !seededRef.current) {
      seededRef.current = true;
      setAmountReceived(
        payInUsd && !deferredFee ? cashDue.toFixed(2) : String(Math.round(cashDue)),
      );
    } else if (deferredFee && seededRef.current) {
      // Keep amount received in sync when rider edits delivery fee.
      setAmountReceived(String(Math.round(cashDue)));
    }
  }, [cashDue, payInUsd, deferredFee, waitingConfirm]);

  useEffect(() => {
    if (!sessionId) return;
    let alive = true;
    let sock: Awaited<ReturnType<typeof connectSocket>> | null = null;

    const handler = (payload: { id?: string; status?: string }) => {
      if (!alive) return;
      if (payload.id !== sessionId) return;
      if (payload.status && payload.status !== 'CONFIRMED') return;
      finishAfterCustomerConfirm('socket');
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
      if (deferredFee && (!Number.isFinite(deliveryFeeNum) || deliveryFeeNum <= 0)) {
        throw new Error('Enter the delivery fee for this Get Anything order');
      }
      if (cashDue > 0 && received === 0) {
        throw new Error('Amount received cannot be zero when cash is due');
      }
      const changeReturned = Math.max(0, Math.round((received - cashDue) * 100) / 100);
      const payload = {
        orderId,
        amountReceived: received,
        changeReturned,
        ...(deferredFee ? { deliveryFee: deliveryFeeNum } : {}),
      };
      try {
        const session = (await createCashPaymentSession(payload)) as {
          id?: string;
          _id?: string;
          status?: string;
        };
        const id = session?.id ?? session?._id ?? null;
        if (!id) throw new Error('Payment session created but no id returned');
        return { id, status: session.status };
      } catch (err) {
        const status = (err as { status?: number } | undefined)?.status;
        const msg = err instanceof Error ? err.message : '';
        const lower = msg.toLowerCase();

        // Already pending — resume instead of failing / false offline queue.
        if (
          status === 409 ||
          lower.includes('already pending') ||
          lower.includes('already confirmed')
        ) {
          const existing = (await fetchCashSessionByOrder(orderId)) as {
            id?: string;
            status?: string;
          } | null;
          if (existing?.id) {
            return { id: String(existing.id), status: existing.status };
          }
        }

        // Only true network failures go offline — not "Request failed (500)".
        const isNetwork =
          status == null &&
          (lower.includes('network') ||
            lower.includes('fetch failed') ||
            lower.includes('failed to fetch') ||
            lower.includes('aborted') ||
            lower.includes('timeout'));
        if (isNetwork) {
          await enqueueOfflineCashSession(payload);
          dialog.alert(
            'Saved offline',
            'Payment recorded locally. It will sync when you are back online. Ask the customer to open their app once you are online.',
          );
          return null;
        }
        throw err;
      }
    },
    onSuccess: (result) => {
      if (!result?.id) return;
      setSessionId(result.id);
      setWaitingConfirm(true);
      void qc.invalidateQueries({ queryKey: ['cash-session-by-order', orderId] });
      if (result.status === 'CONFIRMED') {
        finishAfterCustomerConfirm('resume');
      }
    },
    onError: (e: Error) => dialog.alert('Failed to record payment', e.message),
  });

  const received = Number(amountReceived) || 0;
  const walletDeltaDisplay = Math.round((received - cashDue) * 100) / 100;
  const currencyLabel = payInUsd ? 'USD' : 'JMD';
  const fmt = (n: number) => (payInUsd ? formatUsd(n) : formatJmd(n));
  const dangerSoft = 'rgba(239, 68, 68, 0.1)';
  const customer =
    typeof order?.customerId === 'object' && order?.customerId ? order.customerId : null;
  const customerName = customer?.fullName?.trim() || 'Customer';
  const customerPhone = customer?.mobile?.trim() || '';
  const dropPoint = (order as { deliveryPoint?: { name?: string; campus?: string } } | undefined)
    ?.deliveryPoint;
  const customerAddress = dropPoint?.name
    ? dropPoint.campus
      ? `${dropPoint.name} (${dropPoint.campus})`
      : dropPoint.name
    : order?.customerAddress?.fullAddress ||
      [order?.deliveryAddress?.street, order?.deliveryAddress?.city].filter(Boolean).join(', ') ||
      '';
  const orderLabel = order?.orderNumber
    ? `#${order.orderNumber}`
    : order?._id
      ? `#${order._id.slice(-6).toUpperCase()}`
      : '';

  async function checkIfConfirmed() {
    if (checkingConfirm || completingRef.current || completeMut.isPending) return;
    setCheckingConfirm(true);
    try {
      const result = await existingSessionQ.refetch();
      const s = result.data as { id?: string; status?: string } | null | undefined;
      if (s?.status === 'CONFIRMED') {
        finishAfterCustomerConfirm('check');
        return;
      }
      dialog.alert(
        'Still waiting',
        `Ask ${customerName} to open the CASE app and confirm ${fmt(received)} (Home / Wallet banner or push).`,
      );
    } catch (e) {
      dialog.alert('Could not check', e instanceof Error ? e.message : 'Try again');
    } finally {
      setCheckingConfirm(false);
    }
  }

  async function resendConfirmation() {
    if (resending || !orderId) return;
    setResending(true);
    try {
      let sid = sessionId;
      if (!sid) {
        const existing = (await fetchCashSessionByOrder(orderId)) as
          | { id?: string; status?: string }
          | null;
        if (existing?.id && existing.status === 'PENDING_CUSTOMER') {
          sid = String(existing.id);
          setSessionId(sid);
        }
      }
      if (!sid) {
        // No pending session yet — create one (also notifies customer).
        const created = (await createCashPaymentSession({
          orderId,
          amountReceived: received,
          changeReturned: Math.max(0, Math.round((received - cashDue) * 100) / 100),
          ...(deferredFee && deliveryFeeNum > 0 ? { deliveryFee: deliveryFeeNum } : {}),
        })) as { id?: string } | null;
        sid = created?.id ? String(created.id) : null;
        if (sid) setSessionId(sid);
      } else {
        const reminded = await remindCashPaymentSession(sid);
        if (reminded && reminded.notified === false) {
          throw new Error('Reminder did not reach the customer');
        }
      }
      void existingSessionQ.refetch();
      dialog.alert(
        'Reminder sent',
        `Asked ${customerName} again to confirm ${fmt(received)} on their CASE app.`,
      );
    } catch (e) {
      dialog.alert('Could not remind', e instanceof Error ? e.message : 'Try again');
    } finally {
      setResending(false);
    }
  }

  function sendForConfirm() {
    const receivedAmt = Number(amountReceived);
    if (deferredFee && (!Number.isFinite(deliveryFeeNum) || deliveryFeeNum <= 0)) {
      dialog.alert('Delivery fee required', 'Enter the delivery fee for this Get Anything order.');
      return;
    }
    if (!Number.isFinite(receivedAmt) || receivedAmt < 0) {
      dialog.alert('Invalid amount', 'Enter the cash the customer gave you.');
      return;
    }
    if (cashDue > 0 && receivedAmt === 0) {
      dialog.alert('Invalid amount', 'Amount received cannot be zero when cash is due.');
      return;
    }
    const delta = Math.round((receivedAmt - cashDue) * 100) / 100;
    const money = (n: number) => (payInUsd && !deferredFee ? formatUsd(n) : formatJmd(n));
    const name = customerName === 'Customer' ? 'the customer' : customerName;

    let body =
      `Are you sure you collected ${money(receivedAmt)} from ${name}?\n\n` +
      (deferredFee ? `Delivery fee: ${formatJmd(deliveryFeeNum)}\n` : '') +
      `Cash due: ${money(cashDue)}\n` +
      `This will ask them to confirm on the CASE app.`;

    if (Math.abs(delta) >= (payInUsd && !deferredFee ? 0.01 : 1)) {
      body +=
        delta > 0
          ? `\n\nOverpay ${money(delta)} will credit their wallet after they confirm.`
          : `\n\nShortfall ${money(Math.abs(delta))} will debit their wallet after they confirm.`;
    }

    dialog.confirm('Are you sure?', body, {
      confirmText: 'Yes, send to customer',
      cancelText: 'Edit amount',
      onConfirm: () => submitMut.mutate(),
    });
  }

  if (!orderId || orderQ.isLoading || existingSessionQ.isLoading) {
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

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.backgroundElement }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>
          {deferredFee ? 'Delivery fee & payment' : 'Record payment'}
        </ThemedText>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.duration(280)}>
          <View style={[styles.heroCard, cardStyle, { backgroundColor: theme.backgroundElement }]}>
            <View style={[styles.heroIcon, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="cash-outline" size={22} color={theme.primary} />
            </View>
            <ThemedText type="label" themeColor="textSecondary" style={styles.heroLabel}>
              {deferredFee
                ? `Cash due (items${isCod ? '' : ''} + your delivery fee)`
                : `Cash due at delivery (${currencyLabel})`}
            </ThemedText>
            <ThemedText style={[styles.heroAmount, { color: theme.text }]}>
              {deferredFee ? formatJmd(cashDue) : formatCashDue(order as never)}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.heroHint}>
              {deferredFee
                ? 'Get Anything: set your delivery fee below. Customer must confirm before delivery completes.'
                : payInUsd
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

        {deferredFee ? (
          <Animated.View entering={FadeInDown.delay(40).duration(280)}>
            <View style={[styles.inputCard, cardStyle, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={styles.inputLabel}>Your delivery fee (J$)</ThemedText>
              <View
                style={[
                  styles.inputWrap,
                  { borderColor: theme.border, backgroundColor: theme.backgroundSelected },
                ]}
              >
                <ThemedText style={[styles.currencyPrefix, { color: theme.textSecondary }]}>J$</ThemedText>
                <TextInput
                  value={deliveryFeeInput}
                  onChangeText={(t) => {
                    seededRef.current = true;
                    setDeliveryFeeInput(t.replace(/[^0-9.]/g, ''));
                  }}
                  keyboardType="decimal-pad"
                  style={[styles.input, { color: theme.text }]}
                  editable={!waitingConfirm && !submitMut.isPending}
                  placeholder="0"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
              <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 8, lineHeight: 18 }}>
                Set the fee you want for this trip. Customer confirms it on their app.
              </ThemedText>
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(60).duration(280)}>
          <View style={[styles.inputCard, cardStyle, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText style={styles.inputLabel}>
              Amount received ({payInUsd && !deferredFee ? 'US$' : 'J$'})
            </ThemedText>
            <View style={[styles.inputWrap, { borderColor: theme.border, backgroundColor: theme.backgroundSelected }]}>
              <ThemedText style={[styles.currencyPrefix, { color: theme.textSecondary }]}>
                {payInUsd && !deferredFee ? 'US$' : 'J$'}
              </ThemedText>
              <TextInput
                value={amountReceived}
                onChangeText={setAmountReceived}
                keyboardType="decimal-pad"
                style={[styles.input, { color: theme.text }]}
                editable={!waitingConfirm && !submitMut.isPending}
                placeholder={payInUsd && !deferredFee ? '0.00' : '0'}
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
              Confirmation already sent. Ask them to confirm {fmt(received)} on their CASE app (Home / Wallet banner or push).
            </ThemedText>

            <View style={[styles.customerCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <View style={[styles.customerAvatar, { backgroundColor: theme.partnerSoft }]}>
                <Ionicons name="person" size={20} color={theme.partner} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <ThemedText type="label" themeColor="textSecondary">
                  Ask this customer
                </ThemedText>
                <ThemedText style={styles.customerName} numberOfLines={2}>
                  {customerName}
                </ThemedText>
                {orderLabel ? (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    Order {orderLabel}
                  </ThemedText>
                ) : null}
                {customerAddress ? (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} style={{ marginTop: 2 }}>
                    {customerAddress}
                  </ThemedText>
                ) : null}
                {customerPhone ? (
                  <Pressable
                    onPress={() => Linking.openURL(`tel:${customerPhone}`)}
                    style={styles.phoneRow}
                  >
                    <Ionicons name="call-outline" size={14} color={theme.primary} />
                    <ThemedText type="link" style={{ fontSize: 13 }}>
                      {customerPhone}
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <Pressable
              style={[
                styles.secondaryBtn,
                { borderColor: theme.border, opacity: checkingConfirm || completeMut.isPending ? 0.6 : 1 },
              ]}
              onPress={() => void checkIfConfirmed()}
              disabled={checkingConfirm || completeMut.isPending}
            >
              {checkingConfirm || completeMut.isPending ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <ThemedText style={{ fontFamily: Fonts.semiBold }}>Check if confirmed</ThemedText>
              )}
            </Pressable>
            <Pressable
              style={[
                styles.secondaryBtn,
                { borderColor: theme.primary, opacity: resending ? 0.6 : 1 },
              ]}
              onPress={() => void resendConfirmation()}
              disabled={resending}
            >
              {resending ? (
                <ActivityIndicator color={theme.primary} />
              ) : (
                <ThemedText style={{ fontFamily: Fonts.semiBold, color: theme.primary }}>
                  Resend confirmation to customer
                </ThemedText>
              )}
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
  customerCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderRadius: Layout.inputRadius,
    padding: Spacing.three,
    marginTop: Spacing.two,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: { fontFamily: Fonts.extraBold, fontSize: 16, marginTop: 2 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: Layout.buttonRadius,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: Spacing.two,
    minWidth: '100%',
    alignItems: 'center',
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
