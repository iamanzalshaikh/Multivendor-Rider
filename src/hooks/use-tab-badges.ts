import { useAvailableOrdersQuery } from '@/hooks/queries/rider';
import { useRiderStore } from '@/stores/riderStore';

/** Tab badge counts — reads shared available-orders cache (no duplicate polling). */
export function useTabBadges() {
  const rider = useRiderStore((s) => s.rider);
  const online = rider?.onlineStatus ?? false;
  const hasActive = Boolean(rider?.currentOrderId);

  const availableQ = useAvailableOrdersQuery(online, hasActive);

  const jobCount = hasActive
    ? 0
    : (availableQ.data ?? []).filter((o) => o._id !== rider?.currentOrderId).length;

  return {
    jobCount,
    hasActiveTrip: hasActive,
  };
}
