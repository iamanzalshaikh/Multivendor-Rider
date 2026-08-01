import type { RiderOrder } from '@/types/rider';

/** Platform currency is Jamaican dollars — matches the customer app's "JMD 1,234" style. */
export function formatJmd(amount?: number | string | null): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return 'JMD 0';
  return `JMD ${Math.round(n).toLocaleString('en-US')}`;
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
