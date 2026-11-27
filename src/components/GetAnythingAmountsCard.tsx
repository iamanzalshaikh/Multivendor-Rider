import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RiderOrder } from '@/types/rider';

type GetAnythingSettlement = {
  deliveryFeeDeferred?: boolean;
  getAnything?: {
    estimatedItemPrices?: Record<string, number>;
    purchasedItemPrices?: Record<string, number>;
    purchasedAt?: string;
    walletCredited?: number;
    extraDueFromCustomer?: number;
  };
};

function sumValues(values: Record<string, number> | undefined): number {
  return Object.values(values ?? {}).reduce((s, n) => s + Number(n || 0), 0);
}

function jmd(n: number): string {
  return `J$${Math.round(n).toLocaleString()}`;
}

/**
 * Get Anything money at a glance: the customer's estimate, what the rider paid,
 * and the delivery fee (set at delivery when deferred).
 */
export function GetAnythingAmountsCard({
  order,
  canEnterPurchase,
  onEnterPurchase,
}: {
  order: RiderOrder;
  canEnterPurchase: boolean;
  onEnterPurchase: () => void;
}) {
  const theme = useTheme();
  const settlement = (order.settlement ?? null) as GetAnythingSettlement | null;
  const ga = settlement?.getAnything;
  const purchased = Boolean(ga?.purchasedAt);
  const customItems = (order.items ?? order.orderItems ?? []).filter(
    (i) => i.itemType === 'CUSTOM_REQUEST',
  );

  const estimate = ga?.estimatedItemPrices
    ? sumValues(ga.estimatedItemPrices)
    : customItems.reduce((s, i) => s + Number(i.price ?? 0) * Number(i.quantity || 1), 0);
  const paid = purchased ? sumValues(ga?.purchasedItemPrices) : null;
  const fee = Number(order.deliveryFee ?? 0);
  const feeDeferred = Boolean(order.deliveryFeeDeferred || settlement?.deliveryFeeDeferred);
  const extra = Number(ga?.extraDueFromCustomer ?? 0);
  const credited = Number(ga?.walletCredited ?? 0);

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <View style={styles.header}>
        <Ionicons name="receipt-outline" size={18} color={theme.primary} />
        <ThemedText style={styles.title}>Get Anything amounts</ThemedText>
      </View>

      <Row label="Customer estimate" value={jmd(estimate)} />
      <Row
        label="Purchase amount"
        value={paid != null ? jmd(paid) : 'Not entered yet'}
        muted={paid == null}
        highlight={paid != null}
      />
      <Row
        label="Delivery fee"
        value={fee > 0 ? jmd(fee) : feeDeferred ? 'Set at delivery' : jmd(0)}
        muted={fee <= 0}
      />
      {extra > 0 ? <Row label="Extra to collect at delivery" value={jmd(extra)} highlight /> : null}
      {credited > 0 ? <Row label="Credited to customer wallet" value={jmd(credited)} /> : null}

      {canEnterPurchase ? (
        <Pressable onPress={onEnterPurchase} style={[styles.button, { backgroundColor: theme.primary }]}>
          <ThemedText style={styles.buttonText}>
            {purchased ? 'Edit purchase amount' : 'Enter purchase amount'}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

function Row({
  label,
  value,
  muted,
  highlight,
}: {
  label: string;
  value: string;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText style={[styles.value, muted && { opacity: 0.6 }, highlight && { color: '#FF5A00' }]}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: Spacing.three, gap: Spacing.two, marginBottom: Spacing.two },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: 2 },
  title: { fontFamily: Fonts.bold, fontSize: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  value: { fontFamily: Fonts.bold, fontSize: 14 },
  button: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: Spacing.one },
  buttonText: { color: '#fff', fontFamily: Fonts.bold, fontSize: 14 },
});
