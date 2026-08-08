import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormField } from '@/components/FormField';
import { ThemedText } from '@/components/themed-text';
import { Layout } from '@/constants/layout';
import { Fonts, Spacing } from '@/constants/theme';
import { useShiftPurchasesQuery } from '@/hooks/queries/rider';
import { riderKeys } from '@/hooks/queries/keys';
import { useTheme } from '@/hooks/use-theme';
import { formatJmd } from '@/lib/money';
import {
  logShiftPurchase,
  startCaseShift,
  type ShiftPurchaseCategory,
} from '@/services/riders';

const CATEGORIES: { value: ShiftPurchaseCategory; label: string }[] = [
  { value: 'FUEL', label: 'Fuel' },
  { value: 'PARKING', label: 'Parking' },
  { value: 'FOOD_EXTRA', label: 'Food extras' },
  { value: 'SUPPLIES', label: 'Supplies' },
  { value: 'OTHER', label: 'Other' },
];

function statusTone(status: string, theme: ReturnType<typeof useTheme>) {
  const s = status.toUpperCase();
  if (s === 'APPROVED') return theme.partner;
  if (s === 'REJECTED') return theme.danger;
  return theme.warning;
}

export default function LogPurchaseScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const shiftQ = useShiftPurchasesQuery();

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<ShiftPurchaseCategory>('FUEL');

  const startMut = useMutation({
    mutationFn: () => startCaseShift(0),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: riderKeys.shiftPurchases });
      Alert.alert('Shift started', 'Ask admin to set your opening float if needed.');
    },
    onError: (e: Error) => Alert.alert('Could not start shift', e.message),
  });

  const submitMut = useMutation({
    mutationFn: () =>
      logShiftPurchase({
        amount: Number(amount),
        category,
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: riderKeys.shiftPurchases });
      setAmount('');
      setNote('');
      Alert.alert('Submitted', 'Waiting for admin approval.');
    },
    onError: (e: Error) => Alert.alert('Could not submit', e.message),
  });

  const shift = shiftQ.data?.shift;
  const purchases = shiftQ.data?.purchases ?? [];

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Rider float</ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled">
        {!shift ? (
          <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <ThemedText style={styles.cardTitle}>No open shift</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: 12 }}>
              Start your shift first. Admin sets the opening float separately.
            </ThemedText>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
              disabled={startMut.isPending}
              onPress={() => startMut.mutate()}>
              {startMut.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.primaryBtnText}>Start shift</ThemedText>
              )}
            </Pressable>
          </View>
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText style={styles.cardTitle}>Today&apos;s float</ThemedText>
              <View style={styles.row}>
                <ThemedText type="small" themeColor="textSecondary">
                  Opening float
                </ThemedText>
                <ThemedText style={styles.rowValue}>{formatJmd(shift.floatIssued)}</ThemedText>
              </View>
              <View style={styles.row}>
                <ThemedText type="small" themeColor="textSecondary">
                  Cash collected
                </ThemedText>
                <ThemedText style={styles.rowValue}>{formatJmd(shift.cashCollected)}</ThemedText>
              </View>
              <View style={styles.row}>
                <ThemedText type="small" themeColor="textSecondary">
                  Approved purchases
                </ThemedText>
                <ThemedText style={styles.rowValue}>{formatJmd(shift.cashSpentPurchases)}</ThemedText>
              </View>
              <View style={styles.row}>
                <ThemedText type="small" themeColor="textSecondary">
                  Your keep (fees + tips)
                </ThemedText>
                <ThemedText style={[styles.rowValue, { color: theme.partner }]}>
                  {formatJmd(shift.riderKeep)}
                </ThemedText>
              </View>
              <View style={[styles.row, styles.rowLast]}>
                <ThemedText style={styles.expectLabel}>Expected to return</ThemedText>
                <ThemedText style={[styles.expectValue, { color: theme.primary }]}>
                  {formatJmd(shift.expectedCashReturn)}
                </ThemedText>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText style={styles.cardTitle}>New purchase</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: 12 }}>
                Spent company cash (fuel, parking, etc.)? Log it here for admin approval.
              </ThemedText>

              <ThemedText style={[styles.label, { color: theme.textSecondary }]}>Category</ThemedText>
              <View style={styles.chips}>
                {CATEGORIES.map((c) => {
                  const on = category === c.value;
                  return (
                    <Pressable
                      key={c.value}
                      onPress={() => setCategory(c.value)}
                      style={[
                        styles.chip,
                        {
                          borderColor: on ? theme.primary : theme.border,
                          backgroundColor: on ? theme.primarySoft : theme.background,
                        },
                      ]}>
                      <ThemedText
                        style={{
                          color: on ? theme.primary : theme.text,
                          fontFamily: Fonts.semiBold,
                          fontSize: 13,
                        }}>
                        {c.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              <FormField
                label="Amount (JMD)"
                value={amount}
                onChangeText={setAmount}
                placeholder="e.g. 500"
                keyboardType="decimal-pad"
              />
              <FormField
                label="Note (optional)"
                value={note}
                onChangeText={setNote}
                placeholder="Shell petrol — bike"
              />

              <Pressable
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: theme.primary,
                    opacity: submitMut.isPending || !amount ? 0.6 : 1,
                  },
                ]}
                disabled={submitMut.isPending || !amount || Number(amount) <= 0}
                onPress={() => submitMut.mutate()}>
                {submitMut.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send-outline" size={18} color="#fff" />
                    <ThemedText style={styles.primaryBtnText}>Submit for approval</ThemedText>
                  </>
                )}
              </Pressable>
            </View>

            <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <ThemedText style={styles.cardTitle}>Your purchases</ThemedText>
              {purchases.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No purchases logged on this shift yet.
                </ThemedText>
              ) : (
                purchases.map((p) => (
                  <View key={p.id} style={[styles.purchaseRow, { borderBottomColor: theme.border }]}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.purchaseCat}>
                        {String(p.category).replace(/_/g, ' ')}
                      </ThemedText>
                      {p.note ? (
                        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                          {p.note}
                        </ThemedText>
                      ) : null}
                      {p.rejectReason ? (
                        <ThemedText type="small" style={{ color: theme.danger }}>
                          {p.rejectReason}
                        </ThemedText>
                      ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <ThemedText style={styles.rowValue}>{formatJmd(p.amount)}</ThemedText>
                      <ThemedText type="small" style={{ color: statusTone(p.status, theme) }}>
                        {p.status}
                      </ThemedText>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 18 },
  content: { padding: Spacing.three, gap: Spacing.three },
  card: {
    borderWidth: 1,
    borderRadius: Layout.cardRadius,
    padding: Spacing.three,
  },
  cardTitle: {
    fontFamily: Fonts.bold,
    fontSize: 16,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rowLast: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e4e4e7',
  },
  rowValue: { fontFamily: Fonts.semiBold, fontSize: 14 },
  expectLabel: { fontFamily: Fonts.bold, fontSize: 14 },
  expectValue: { fontFamily: Fonts.extraBold, fontSize: 16 },
  label: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    marginBottom: 6,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryBtn: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: Layout.buttonRadius,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtnText: { color: '#fff', fontFamily: Fonts.bold, fontSize: 15 },
  purchaseRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  purchaseCat: { fontFamily: Fonts.semiBold, fontSize: 14, textTransform: 'capitalize' },
});
