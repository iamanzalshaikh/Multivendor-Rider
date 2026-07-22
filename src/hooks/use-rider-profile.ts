import { useEffect } from 'react';

import { useRiderMeQuery } from '@/hooks/queries/rider';
import { useRiderStore } from '@/stores/riderStore';

/** Fetches rider profile, keeps Zustand store in sync for all tabs. */
export function useRiderProfile() {
  const rider = useRiderStore((s) => s.rider);
  const setRider = useRiderStore((s) => s.setRider);

  const query = useRiderMeQuery();

  useEffect(() => {
    if (query.data?.rider) setRider(query.data.rider);
  }, [query.data?.rider, setRider]);

  const profile = query.data?.rider ?? rider;

  return {
    ...query,
    rider: profile,
    user: query.data?.user,
    onlineStatus: profile?.onlineStatus ?? false,
    currentOrderId: profile?.currentOrderId,
    verificationStatus: profile?.verificationStatus ?? 'pending',
  };
}
