import {
  nextRiderAction,
  RIDER_STATUS_LABELS,
  statusForRiderAction,
  stepIndexForStatus,
} from '@/constants/deliveryStatus';
import { formatPickupNames, orderDisplayId } from '@/lib/orderDisplay';
import type { RiderOrder } from '@/types/rider';

export type BatchTargetStatus = 'PROCESSING' | 'ON_THE_WAY' | 'ARRIVED';

const BATCH_TARGETS: BatchTargetStatus[] = ['PROCESSING', 'ON_THE_WAY', 'ARRIVED'];

export function normalizeBatchStatus(status: string | null | undefined): string {
  const s = String(status ?? '').toUpperCase();
  if (s === 'PICKED_UP') return 'PROCESSING';
  if (s === 'COMPLETED') return 'DELIVERED';
  return s;
}

export function batchStatusLabel(status: string | null | undefined): string {
  const key = normalizeBatchStatus(status);
  return RIDER_STATUS_LABELS[key] ?? key.replace(/_/g, ' ');
}

/** True when this order can move forward to the chosen batch target. */
export function canBatchAdvanceTo(
  order: RiderOrder | null | undefined,
  target: BatchTargetStatus,
): boolean {
  if (!order) return false;
  const current = normalizeBatchStatus(order.orderStatus);
  if (current === 'DELIVERED' || current === 'CANCELLED') return false;
  // Already at/past target — not selectable for that step.
  if (stepIndexForStatus(current) >= stepIndexForStatus(target)) return false;
  // Arrived orders complete individually (COD / confirm) — never batch-complete.
  if (current === 'ARRIVED') return false;
  return true;
}

export type BatchOrderRow = {
  id: string;
  label: string;
  store: string;
  status: string;
  statusLabel: string;
  nextTarget: BatchTargetStatus | null;
};

export function toBatchOrderRow(order: RiderOrder): BatchOrderRow {
  const status = normalizeBatchStatus(order.orderStatus);
  const next = nextRiderAction(status);
  const nextStatus = next ? statusForRiderAction(next) : null;
  const nextTarget =
    nextStatus && BATCH_TARGETS.includes(nextStatus as BatchTargetStatus)
      ? (nextStatus as BatchTargetStatus)
      : null;
  return {
    id: order._id,
    label: orderDisplayId(order),
    store: formatPickupNames(order),
    status,
    statusLabel: batchStatusLabel(status),
    nextTarget,
  };
}

export function statusBreakdown(orders: RiderOrder[]): string {
  const counts = new Map<string, number>();
  for (const o of orders) {
    const label = batchStatusLabel(o.orderStatus);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, n]) => `${n} ${label}`)
    .join(' · ');
}

/** Human reason when not all trips share the same step. */
export function batchMismatchReason(orders: RiderOrder[]): string | null {
  if (orders.length < 2) return null;
  const statuses = new Set(orders.map((o) => normalizeBatchStatus(o.orderStatus)));
  if (statuses.size <= 1) return null;
  const ahead = [...orders].sort(
    (a, b) => stepIndexForStatus(b.orderStatus) - stepIndexForStatus(a.orderStatus),
  )[0];
  return (
    `Trips are on different steps (${statusBreakdown(orders)}). ` +
    `${orderDisplayId(ahead)} is ahead (${batchStatusLabel(ahead.orderStatus)}). ` +
    `Select matching orders below to batch-update them together.`
  );
}

/** Default selection: largest group that shares the same next batch target. */
export function defaultSelectedOrderIds(orders: RiderOrder[]): {
  selectedIds: string[];
  suggestedTarget: BatchTargetStatus | null;
  reason: string | null;
} {
  const rows = orders.map(toBatchOrderRow);
  const byTarget = new Map<BatchTargetStatus, string[]>();
  for (const row of rows) {
    if (!row.nextTarget) continue;
    const list = byTarget.get(row.nextTarget) ?? [];
    list.push(row.id);
    byTarget.set(row.nextTarget, list);
  }

  let suggestedTarget: BatchTargetStatus | null = null;
  let selectedIds: string[] = [];
  for (const target of BATCH_TARGETS) {
    const ids = byTarget.get(target) ?? [];
    if (ids.length > selectedIds.length) {
      selectedIds = ids;
      suggestedTarget = target;
    }
  }

  // Fallback: everything still pre-arrived.
  if (!selectedIds.length) {
    selectedIds = rows
      .filter((r) => r.status !== 'ARRIVED' && r.status !== 'DELIVERED')
      .map((r) => r.id);
    suggestedTarget = selectedIds.length ? 'PROCESSING' : null;
  }

  return {
    selectedIds,
    suggestedTarget,
    reason: batchMismatchReason(orders),
  };
}

export function availableTargetsForSelection(
  orders: RiderOrder[],
  selectedIds: string[],
): BatchTargetStatus[] {
  const selected = orders.filter((o) => selectedIds.includes(o._id));
  return BATCH_TARGETS.filter((target) =>
    selected.some((o) => canBatchAdvanceTo(o, target)),
  );
}

export function targetButtonLabel(status: BatchTargetStatus): string {
  if (status === 'PROCESSING') return 'Mark Processing';
  if (status === 'ON_THE_WAY') return 'Start delivery (On the way)';
  return 'Mark Arrived';
}
