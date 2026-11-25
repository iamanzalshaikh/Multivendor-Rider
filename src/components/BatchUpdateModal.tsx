import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  availableTargetsForSelection,
  batchMismatchReason,
  batchStatusLabel,
  canBatchAdvanceTo,
  defaultSelectedOrderIds,
  statusBreakdown,
  targetButtonLabel,
  toBatchOrderRow,
  type BatchTargetStatus,
} from '@/lib/batchUpdate';
import type { RiderOrder } from '@/types/rider';

type Props = {
  visible: boolean;
  orders: RiderOrder[];
  busy?: boolean;
  onClose: () => void;
  onConfirm: (input: {
    status: BatchTargetStatus;
    orderIds: string[];
  }) => void | Promise<void>;
};

export function BatchUpdateModal({ visible, orders, busy, onClose, onConfirm }: Props) {
  const theme = useTheme();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [target, setTarget] = useState<BatchTargetStatus | null>(null);

  useEffect(() => {
    if (!visible) return;
    const defaults = defaultSelectedOrderIds(orders);
    setSelectedIds(defaults.selectedIds);
    setTarget(defaults.suggestedTarget);
  }, [visible, orders]);

  const reason = useMemo(() => batchMismatchReason(orders), [orders]);
  const rows = useMemo(() => orders.map(toBatchOrderRow), [orders]);
  const targets = useMemo(
    () => availableTargetsForSelection(orders, selectedIds),
    [orders, selectedIds],
  );

  useEffect(() => {
    if (!target) return;
    if (!targets.includes(target)) {
      setTarget(targets[0] ?? null);
    }
  }, [targets, target]);

  function toggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function selectEligibleFor(next: BatchTargetStatus) {
    setTarget(next);
    setSelectedIds(
      orders.filter((o) => canBatchAdvanceTo(o, next)).map((o) => o._id),
    );
  }

  const selectedEligibleCount = target
    ? orders.filter((o) => selectedIds.includes(o._id) && canBatchAdvanceTo(o, target)).length
    : 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText style={styles.title}>Batch update</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
            {orders.length} active trips · {statusBreakdown(orders)}
          </ThemedText>

          {reason ? (
            <View style={[styles.reasonBox, { backgroundColor: theme.primarySoft }]}>
              <Ionicons name="information-circle" size={18} color={theme.primary} />
              <ThemedText style={[styles.reasonText, { color: theme.primary }]}>{reason}</ThemedText>
            </View>
          ) : (
            <ThemedText type="small" themeColor="textSecondary" style={{ marginBottom: Spacing.three }}>
              All selected trips share the same step — pick a status to apply.
            </ThemedText>
          )}

          <ThemedText type="label" themeColor="textSecondary" style={{ marginBottom: 8 }}>
            Select orders
          </ThemedText>
          <ScrollView style={styles.list} contentContainerStyle={{ gap: 8 }}>
            {rows.map((row) => {
              const checked = selectedIds.includes(row.id);
              const blockedForTarget = target ? !canBatchAdvanceTo(
                orders.find((o) => o._id === row.id),
                target,
              ) : false;
              return (
                <Pressable
                  key={row.id}
                  onPress={() => toggle(row.id)}
                  style={[
                    styles.row,
                    {
                      borderColor: checked ? theme.primary : theme.border,
                      backgroundColor: checked ? theme.primarySoft : theme.background,
                      opacity: blockedForTarget && checked ? 0.75 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: checked ? theme.primary : theme.border,
                        backgroundColor: checked ? theme.primary : 'transparent',
                      },
                    ]}
                  >
                    {checked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <ThemedText style={styles.rowTitle} numberOfLines={1}>
                      {row.label} · {row.store}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Now: {row.statusLabel}
                      {blockedForTarget && target
                        ? ` · cannot move to ${batchStatusLabel(target)}`
                        : row.nextTarget
                          ? ` · next: ${batchStatusLabel(row.nextTarget)}`
                          : ''}
                    </ThemedText>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          <ThemedText type="label" themeColor="textSecondary" style={{ marginTop: Spacing.three, marginBottom: 8 }}>
            Apply status to selected
          </ThemedText>
          <View style={{ gap: 8, width: '100%' }}>
            {(['PROCESSING', 'ON_THE_WAY', 'ARRIVED'] as BatchTargetStatus[]).map((status) => {
              const eligible = orders.filter((o) => canBatchAdvanceTo(o, status)).length;
              const disabled = eligible === 0;
              const active = target === status;
              return (
                <Pressable
                  key={status}
                  disabled={disabled}
                  onPress={() => selectEligibleFor(status)}
                  style={[
                    styles.statusBtn,
                    {
                      borderColor: active ? theme.primary : theme.border,
                      backgroundColor: active ? theme.primarySoft : 'transparent',
                      opacity: disabled ? 0.45 : 1,
                    },
                  ]}
                >
                  <ThemedText style={{ fontFamily: Fonts.bold }}>
                    {targetButtonLabel(status)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {eligible ? `${eligible} eligible` : 'None eligible'}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            disabled={busy || !target || selectedEligibleCount === 0}
            onPress={() => {
              if (!target) return;
              const orderIds = orders
                .filter((o) => selectedIds.includes(o._id) && canBatchAdvanceTo(o, target))
                .map((o) => o._id);
              if (!orderIds.length) return;
              void onConfirm({ status: target, orderIds });
            }}
            style={[
              styles.confirm,
              {
                backgroundColor: theme.partner,
                opacity: busy || !target || selectedEligibleCount === 0 ? 0.55 : 1,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.confirmText}>
                Update {selectedEligibleCount || 0} selected
              </ThemedText>
            )}
          </Pressable>

          <Pressable onPress={onClose} style={styles.cancel}>
            <ThemedText type="small" themeColor="textSecondary">
              Cancel
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  sheet: {
    borderRadius: 16,
    padding: Spacing.four,
    maxHeight: '88%',
  },
  title: { fontSize: 20, fontFamily: Fonts.extraBold },
  subtitle: { marginTop: 4, marginBottom: Spacing.three },
  reasonBox: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 12,
    padding: 12,
    marginBottom: Spacing.three,
  },
  reasonText: { flex: 1, fontSize: 12, fontFamily: Fonts.medium, lineHeight: 17 },
  list: { maxHeight: 220 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 13, fontFamily: Fonts.bold },
  statusBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  confirm: {
    marginTop: Spacing.four,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontFamily: Fonts.extraBold, fontSize: 15 },
  cancel: { alignItems: 'center', paddingVertical: 12 },
});
