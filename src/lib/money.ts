import type { RiderOrder } from '@/types/rider';

/** Platform currency is Jamaican dollars — matches the customer app's "JMD 1,234" style. */
export function formatJmd(amount?: number | string | null): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return 'JMD 0';
  return `JMD ${Math.round(n).toLocaleString('en-US')}`;
}

export function formatUsd(amount?: number | string | null): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return 'US$0.00';
  return `US$${n.toFixed(2)}`;
}

export function formatOrderTotal(order: {
  grandTotal?: number | null;
  totalUsd?: number | null;
  payInUsd?: boolean | null;
}): string {
  const jmd = Number(order.grandTotal ?? 0);
  if (order.payInUsd && order.totalUsd != null) {
    return `${formatJmd(jmd)} = ${formatUsd(order.totalUsd)}`;
  }
  return formatJmd(jmd);
}

export function formatCashDue(order: {
  cashDueAtDelivery?: number | null;
  grandTotal?: number | null;
  cashDueUsd?: number | null;
  totalUsd?: number | null;
  payInUsd?: boolean | null;
}): string {
  const jmd = Number(order.cashDueAtDelivery ?? order.grandTotal ?? 0);
  const usd =
    order.cashDueUsd != null
      ? Number(order.cashDueUsd)
      : order.totalUsd != null
        ? Number(order.totalUsd)
        : null;
  if (order.payInUsd && usd != null) {
    return `${formatJmd(jmd)} = ${formatUsd(usd)}`;
  }
  return formatJmd(jmd);
}

/**
 * A rider keeps the delivery fee the customer paid, plus any tip. There is no flat
 * per-trip fee, so this must be read off the order rather than hardcoded.
 */
export function riderEarningForOrder(
  order: Pick<RiderOrder, 'deliveryFee' | 'tipAmount'> | null | undefined,
): number {
  if (!order) return 0;
  return Number(order.deliveryFee ?? 0) + Number(order.tipAmount ?? 0);
}

/** Payment states where the money has actually settled and the earning is payable. */
const SETTLED = ['COLLECTED', 'APPROVED', 'CAPTURED', 'PAID'];

export function isEarningSettled(order: Pick<RiderOrder, 'paymentStatus'>): boolean {
  return SETTLED.includes(String(order.paymentStatus ?? '').toUpperCase());
}
