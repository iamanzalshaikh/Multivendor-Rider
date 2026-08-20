import { useEffect } from 'react';
import * as Location from 'expo-location';

import { V1_LIVE_LOCATION_ENABLED } from '@/hooks/use-rider-location';
import { updateRiderLocation } from '@/services/riders';

const ACTIVE_STATUSES = new Set([
  'RIDER_ASSIGNED',
  'PICKED_UP',
  'ON_THE_WAY',
  'READY_FOR_PICKUP',
]);

/** Sends GPS to backend while rider views an active delivery. Disabled while live map is off. */
export function useOrderLocationPing(orderStatus?: string) {
  useEffect(() => {
    if (!V1_LIVE_LOCATION_ENABLED) return;
    if (!orderStatus || !ACTIVE_STATUSES.has(orderStatus)) return;

    let sub: Location.LocationSubscription | null = null;
    let alive = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !alive) return;

      sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 30,
          timeInterval: 30_000,
        },
        (loc) => {
          void updateRiderLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            speed: loc.coords.speed ?? undefined,
            heading: loc.coords.heading ?? undefined,
          }).catch(() => {});
        },
      );
    })();

    return () => {
      alive = false;
      sub?.remove();
    };
  }, [orderStatus]);
}
