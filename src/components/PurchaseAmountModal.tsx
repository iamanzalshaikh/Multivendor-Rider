import { useEffect, useState } from 'react';
import { BackHandler, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type PurchaseLine = {
  itemId: string;
  name: string;
  quantity: number;
  /** Customer's estimate (what they expected to spend). */
  estimate: number;
};

type Props = {
  visible: boolean;
  lines: PurchaseLine[];
  busy?: boolean;
  onConfirm: (prices: Array<{ itemId: string; purchasedPrice: number }>) => void;
  onCancel: () => void;
};

/** Rider enters what was actually paid for each Get Anything item. */
export function PurchaseAmountModal({ visible, lines, busy, onConfirm, onCancel }: Props) {
  const theme = useTheme();
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setValues(Object.fromEntries(lines.map((l) => [l.itemId, String(Math.round(l.estimate))])));
  }, [visible, lines]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancel();
      return true;
    });
    return () => sub.remove();
  }, [visible, onCancel]);

  const total = lines.reduce((sum, l) => sum + (Number(values[l.itemId]) || 0), 0);

  function submit() {
    const prices: Array<{ itemId: string; purchasedPrice: number }> = [];
    for (const l of lines) {
      const raw = (values[l.itemId] ?? '').trim();
      const n = Number(raw);
      if (raw === '' || !Number.isFinite(n) || n < 0) {
        setError(`Enter the amount paid for ${l.name}.`);
        return;
      }
      prices.push({ itemId: l.itemId, purchasedPrice: Math.round(n * 100) / 100 });
    }
    setError(null);
    onConfirm(prices);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          <View style={[styles.iconWrap, { backgroundColor: theme.primarySoft }]}>
            <Ionicons name="receipt-outline" size={26} color={theme.primary} />
          </View>
          <ThemedText style={styles.title}>Amount you paid</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            The customer&apos;s budget was an estimate. Enter the exact amount you paid for each item.
          </ThemedText>

          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {lines.map((l) => (
              <View key={l.itemId} style={styles.row}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText style={styles.itemName} numberOfLines={2}>
                    {l.quantity}× {l.name}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Estimate J${Math.round(l.estimate)}
                  </ThemedText>
                </View>
                <View style={[styles.inputWrap, { borderColor: theme.border }]}>
                  <ThemedText type="small" themeColor="textSecondary">J$</ThemedText>
                  <TextInput
                    value={values[l.itemId] ?? ''}
                    onChangeText={(t) => setValues((v) => ({ ...v, [l.itemId]: t.replace(/[^0-9.]/g, '') }))}
                    keyboardType="decimal-pad"
                    style={[styles.input, { color: theme.text }]}
                    selectTextOnFocus
                  />
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.totalRow}>
            <ThemedText type="small" themeColor="textSecondary">Items paid total</ThemedText>
            <ThemedText style={styles.totalValue}>J${total.toFixed(0)}</ThemedText>
          </View>

          {error ? (
            <ThemedText type="small" style={{ color: theme.danger, textAlign: 'center' }}>
              {error}
            </ThemedText>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={busy}
            style={[styles.confirmBtn, { backgroundColor: theme.primary, opacity: busy ? 0.6 : 1 }]}
          >
            <ThemedText style={styles.confirmText}>{busy ? 'Saving…' : 'Confirm & mark bought'}</ThemedText>
          </Pressable>
          <Pressable onPress={onCancel} style={styles.cancelBtn} disabled={busy}>
            <ThemedText type="small" themeColor="textSecondary">Cancel</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  card: { width: '100%', maxWidth: 420, borderRadius: 22, padding: Spacing.four, gap: Spacing.two, maxHeight: '85%' },
  iconWrap: { alignSelf: 'center', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title: { textAlign: 'center', fontSize: 18, fontFamily: Fonts.bold },
  subtitle: { textAlign: 'center', lineHeight: 20 },
  list: { flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two },
  itemName: { fontFamily: Fonts.bold, fontSize: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, minWidth: 110 },
  input: { flex: 1, fontSize: 16, fontFamily: Fonts.bold, paddingVertical: 8, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddd', paddingTop: Spacing.two },
  totalValue: { fontFamily: Fonts.bold, fontSize: 16 },
  confirmBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: Spacing.one },
  confirmText: { color: '#fff', fontFamily: Fonts.bold, fontSize: 15 },
  cancelBtn: { alignItems: 'center', paddingVertical: Spacing.two },
});
