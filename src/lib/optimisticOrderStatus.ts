import type { QueryClient } from '@tanstack/react-query';

import { riderKeys } from '@/hooks/queries/keys';
import type { RiderOrder } from '@/types/rider';

/** Map rider UI actions → orderStatus for optimistic cache updates. */
export function optimisticStatusForAction(action: string): string | null {
  if (action === 'accept') return 'RIDER_ASSIGNED';
  if (action === 'pickup') return 'PICKED_UP';
  if (action === 'start' || action === 'arrived') return 'ARRIVED';
  if (action === 'complete') return 'COMPLETED';
  return null;
}

export function patchOrderStatusOptimistic(
  qc: QueryClient,
  orderId: string,
  status: string,
): RiderOrder | undefined {
  const key = riderKeys.order(orderId);
  const prev = qc.getQueryData<RiderOrder>(key);
  if (prev) {
    qc.setQueryData<RiderOrder>(key, { ...prev, orderStatus: status });
  }
  return prev;
}
