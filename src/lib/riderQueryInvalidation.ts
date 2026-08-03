import type { QueryClient } from '@tanstack/react-query';

import { riderKeys } from '@/hooks/queries/keys';
import { ServerSocketEvents } from '@/lib/socketEvents';

export function invalidateRiderProfile(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: riderKeys.me });
}

export function invalidateRiderOrder(qc: QueryClient, orderId?: string) {
  if (!orderId) return;
  // refetchType 'all' — Trip screen also has enabled:false cache subscribers
  void qc.invalidateQueries({ queryKey: riderKeys.order(orderId), refetchType: 'all' });
}

export function patchRiderOrderFromSocket(
  qc: QueryClient,
  payload: { orderId?: string; orderStatus?: string; paymentStatus?: string },
) {
  if (!payload.orderId) return;
  qc.setQueryData(riderKeys.order(payload.orderId), (prev: Record<string, unknown> | undefined) => {
    if (!prev) return prev;
    return {
      ...prev,
      ...(payload.orderStatus ? { orderStatus: payload.orderStatus } : {}),
      ...(payload.paymentStatus ? { paymentStatus: payload.paymentStatus } : {}),
    };
  });
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
    event === ServerSocketEvents.RIDER_ASSIGNED ||
    event === ServerSocketEvents.ORDER_CANCELLED
  ) {
    invalidateAvailableOrders(qc);
  }

  if (event === ServerSocketEvents.ORDER_DELIVERED || event === ServerSocketEvents.ORDER_CANCELLED) {
    invalidateRiderEarnings(qc);
  }
}
