import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

export type RiderGpsCoord = {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
} | null;

function normalizeHeading(value?: number | null) {
  if (value == null || !Number.isFinite(value) || value < 0) return undefined;
  return value;
}

/** Live rider GPS — tuned for navigation / map follow. */
export function useRiderGps(enabled = true): RiderGpsCoord {
  const [coord, setCoord] = useState<RiderGpsCoord>(null);

  useEffect(() => {
    if (!enabled) {
      setCoord(null);
      return;
    }

    let positionSub: Location.LocationSubscription | null = null;
    let headingSub: Location.LocationSubscription | null = null;
    let alive = true;
    let lastHeading: number | undefined;

    const apply = (latitude: number, longitude: number, heading?: number, speed?: number) => {
      const h = normalizeHeading(heading) ?? lastHeading;
      if (h != null) lastHeading = h;
      setCoord({ latitude, longitude, heading: h, speed });
    };

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || !alive) return;

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      }).catch(() => null);

      if (current && alive) {
        apply(
          current.coords.latitude,
          current.coords.longitude,
          current.coords.heading ?? undefined,
          current.coords.speed ?? undefined,
        );
      }

      positionSub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 8,
          timeInterval: 3_000,
        },
        (loc) => {
          if (!alive) return;
          apply(
            loc.coords.latitude,
            loc.coords.longitude,
            loc.coords.heading ?? undefined,
            loc.coords.speed ?? undefined,
          );
        },
      );

      if (Location.watchHeadingAsync) {
        try {
          headingSub = await Location.watchHeadingAsync((h) => {
            if (!alive) return;
            const deg = normalizeHeading(h.trueHeading >= 0 ? h.trueHeading : h.magHeading);
            if (deg != null) lastHeading = deg;
          });
        } catch {
          // Heading watcher optional on some Android devices.
        }
      }
    })();

    return () => {
      alive = false;
      positionSub?.remove();
      headingSub?.remove();
    };
  }, [enabled]);

  return coord;
}
