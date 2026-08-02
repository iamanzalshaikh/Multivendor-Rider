import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { cardStyle, Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { invalidateAfterOrderAction } from '@/lib/riderQueryInvalidation';
import { formatJmd } from '@/lib/money';
import { acceptOrder } from '@/services/riders';
import { useDeliveryOfferStore } from '@/stores/deliveryOfferStore';
import { useRiderStore } from '@/stores/riderStore';

export function DeliveryOfferModal() {
  const theme = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const offer = useDeliveryOfferStore((s) => s.offer);
  const clearOffer = useDeliveryOfferStore((s) => s.clearOffer);
  const hasActiveOrder = useRiderStore((s) => Boolean(s.rider?.currentOrderId));
  const [secondsLeft, setSecondsLeft] = useState(0);

  const acceptMut = useMutation({
    mutationFn: (orderId: string) => acceptOrder(orderId),
    onSuccess: (_order, orderId) => {
      clearOffer(orderId);
      invalidateAfterOrderAction(qc, orderId);
      router.replace('/(tabs)/orders');
    },
    onError: (e, orderId) => {
      const msg = e instanceof Error ? e.message : 'Could not accept';
      if (msg.toLowerCase().includes('assigned') || msg.toLowerCase().includes('available')) {
        clearOffer(orderId);
        Alert.alert('Too late', 'Another rider accepted this delivery.');
      } else {
        Alert.alert('Accept failed', msg);
      }
    },
  });

  useEffect(() => {
    if (!offer || hasActiveOrder) return;

    const tick = () => {
      const left = Math.max(0, Math.ceil((offer.expiresAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) clearOffer(offer.orderId);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [offer, hasActiveOrder, clearOffer]);

  const visible = Boolean(offer) && !hasActiveOrder;

  if (!visible || !offer) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => clearOffer(offer.orderId)}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, cardStyle, { backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.badge, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.badgeText}>New delivery</ThemedText>
          </View>

          <ThemedText style={styles.orderId}>#{offer.orderNumber}</ThemedText>
          <ThemedText style={styles.restaurant}>{offer.restaurantName}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
            Order value {formatJmd(offer.grandTotal)} · You earn {formatJmd(offer.riderEarning)}
          </ThemedText>

          <View style={[styles.timerRow, { backgroundColor: theme.primarySoft }]}>
            <ThemedText style={[styles.timer, { color: theme.primary }]}>
              {secondsLeft}s
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              to accept before offer expires
            </ThemedText>
          </View>

          <Pressable
            onPress={() => acceptMut.mutate(offer.orderId)}
            disabled={acceptMut.isPending}
            style={[styles.acceptBtn, { backgroundColor: theme.partner, opacity: acceptMut.isPending ? 0.8 : 1 }]}>
            {acceptMut.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.acceptText}>Accept delivery</ThemedText>
            )}
          </Pressable>

          <Pressable onPress={() => clearOffer(offer.orderId)} style={styles.declineBtn}>
            <ThemedText type="small" themeColor="textSecondary">
              Not now
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    margin: Layout.screenPadding,
    marginBottom: Spacing.four,
    padding: Spacing.three,
    borderRadius: Layout.cardRadius,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: Spacing.two,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: Fonts.bold,
    textTransform: 'uppercase',
  },
  orderId: {
    fontSize: 22,
    fontFamily: Fonts.extraBold,
  },
  restaurant: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    marginTop: 4,
  },
  meta: {
    marginTop: 6,
  },
  timerRow: {
    marginTop: Spacing.three,
    borderRadius: Layout.inputRadius,
    padding: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  timer: {
    fontSize: 20,
    fontFamily: Fonts.extraBold,
    minWidth: 36,
  },
  acceptBtn: {
    marginTop: Spacing.three,
    borderRadius: Layout.buttonRadius,
    paddingVertical: 16,
    alignItems: 'center',
  },
  acceptText: {
    color: '#fff',
    fontFamily: Fonts.extraBold,
    fontSize: 16,
  },
  declineBtn: {
    marginTop: Spacing.two,
    alignItems: 'center',
    paddingVertical: 8,
  },
});
