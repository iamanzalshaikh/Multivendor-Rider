import type { QueryClient } from '@tanstack/react-query';

import { riderKeys } from '@/hooks/queries/keys';
import { ServerSocketEvents } from '@/lib/socketEvents';

export function invalidateRiderProfile(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: riderKeys.me });
}

export function invalidateRiderOrder(qc: QueryClient, orderId?: string) {
  if (!orderId) return;
  void qc.invalidateQueries({ queryKey: riderKeys.order(orderId) });
}

export function invalidateAvailableOrders(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: riderKeys.availableOrders });
}

export function invalidateRiderEarnings(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: riderKeys.earnings });
  void qc.invalidateQueries({ queryKey: riderKeys.earningsSummary });
  void qc.invalidateQueries({ queryKey: ['rider', 'history'] });
}

/** After rider accepts / rejects / pickup / start / complete on an order. */
export function invalidateAfterOrderAction(qc: QueryClient, orderId: string) {
  invalidateRiderProfile(qc);
  invalidateRiderOrder(qc, orderId);
  invalidateAvailableOrders(qc);
}

/** After delivery completes — earnings and history may change. */
export function invalidateAfterDeliveryComplete(qc: QueryClient, orderId: string) {
  invalidateAfterOrderAction(qc, orderId);
  invalidateRiderEarnings(qc);
}

export function invalidateAfterSocketOrderEvent(
  qc: QueryClient,
  event: string,
  orderId?: string,
) {
  if (event === ServerSocketEvents.DELIVERY_AVAILABLE) {
    invalidateAvailableOrders(qc);
    return;
  }

  invalidateRiderProfile(qc);
  invalidateRiderOrder(qc, orderId);

  if (
    event === ServerSocketEvents.DELIVERY_CLAIMED ||
    event === ServerSocketEvents.RIDER_ASSIGNED
  ) {
    invalidateAvailableOrders(qc);
  }

  if (event === ServerSocketEvents.ORDER_DELIVERED) {
    invalidateRiderEarnings(qc);
  }
}
