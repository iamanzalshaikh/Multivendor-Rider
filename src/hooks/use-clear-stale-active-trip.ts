import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { riderKeys } from '@/hooks/queries/keys';
import { useRiderStore } from '@/stores/riderStore';

const TERMINAL = new Set(['CANCELLED', 'COMPLETED', 'DELIVERED']);

/**
 * If the active trip order is already cancelled/completed, drop currentOrderId
 * locally and refresh /me + jobs so the rider is not stuck on Trip.
 */
export function useClearStaleActiveTrip(orderId?: string | null, orderStatus?: string | null) {
  const qc = useQueryClient();
  const rider = useRiderStore((s) => s.rider);
  const setRider = useRiderStore((s) => s.setRider);

  useEffect(() => {
    const status = String(orderStatus ?? '').toUpperCase();
    if (!orderId || !status || !TERMINAL.has(status)) return;
    if (!rider?.currentOrderId || rider.currentOrderId !== orderId) return;

    setRider({ ...rider, currentOrderId: undefined });
    void qc.invalidateQueries({ queryKey: riderKeys.me });
    void qc.invalidateQueries({ queryKey: riderKeys.availableOrders });
  }, [orderId, orderStatus, rider, setRider, qc]);
}
