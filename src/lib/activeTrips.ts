import type { QueryClient } from '@tanstack/react-query';

import { riderKeys } from '@/hooks/queries/keys';
import { useRiderStore } from '@/stores/riderStore';

/**
 * Update the rider's active-trip list at once (profile cache + store), so the trip
 * page reacts before the server replies. The server result is still refreshed afterwards.
 */
export function setActiveTripIds(qc: QueryClient, update: (ids: string[]) => string[]) {
  qc.setQueryData(riderKeys.me, (prev: unknown) => {
    const data = prev as { rider?: { activeOrderIds?: string[] } } | undefined;
    if (!data?.rider) return prev;
    return {
      ...data,
      rider: { ...data.rider, activeOrderIds: update(data.rider.activeOrderIds ?? []) },
    };
  });
  const { rider, setRider } = useRiderStore.getState();
  if (rider) setRider({ ...rider, activeOrderIds: update(rider.activeOrderIds ?? []) });
}

export function addActiveTrip(qc: QueryClient, orderId: string) {
  setActiveTripIds(qc, (ids) => (ids.includes(orderId) ? ids : [...ids, orderId]));
}

export function removeActiveTrip(qc: QueryClient, orderId: string) {
  setActiveTripIds(qc, (ids) => ids.filter((id) => id !== orderId));
}
