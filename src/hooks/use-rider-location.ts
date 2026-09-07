import { useEffect } from 'react';
import * as Location from 'expo-location';

import {
  ensureRiderLocationTaskRegistered,
  RIDER_LOCATION_TASK,
} from '@/tasks/riderLocationTask';

/** Live GPS broadcast is off for now — status updates only. */
export const V1_LIVE_LOCATION_ENABLED = false;

async function safeStopBackgroundLocation(): Promise<void> {
  // Do not touch expo-task-manager while live tracking is disabled.
  // Expo Go / JS-only reloads do not ship ExpoTaskManager and would crash on require().
  if (!V1_LIVE_LOCATION_ENABLED) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TaskManager = require('expo-task-manager') as typeof import('expo-task-manager');
    if (!TaskManager.isTaskDefined(RIDER_LOCATION_TASK)) return;
    const isRegistered = await TaskManager.isTaskRegisteredAsync(RIDER_LOCATION_TASK);
    if (!isRegistered) return;
    const started = await Location.hasStartedLocationUpdatesAsync(RIDER_LOCATION_TASK);
    if (started) await Location.stopLocationUpdatesAsync(RIDER_LOCATION_TASK);
  } catch {
    // Ignore TaskNotFound or missing native module during boot/reload.
  }
}

/**
 * When enabled, starts background GPS for active trips.
 * Currently hard-disabled — no TaskManager access until a native build with the module.
 */
export function useRiderLocationTracking(enabled: boolean) {
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        if (!V1_LIVE_LOCATION_ENABLED) return;
        await safeStopBackgroundLocation();
        if (!enabled || !alive) return;

        ensureRiderLocationTaskRegistered();

        const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        if (fgStatus !== 'granted' || !alive) return;

        await Location.requestBackgroundPermissionsAsync();
        if (!alive) return;

        ensureRiderLocationTaskRegistered();

        const started = await Location.hasStartedLocationUpdatesAsync(RIDER_LOCATION_TASK);
        if (started || !alive) return;

        await Location.startLocationUpdatesAsync(RIDER_LOCATION_TASK, {
          accuracy: Location.Accuracy.High,
          distanceInterval: 25,
          timeInterval: 15000,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'SD Services Rider',
            notificationBody: 'On an active delivery',
            notificationColor: '#ff5a00',
          },
        });
      } catch (err) {
        console.warn('[use-rider-location] Failed to start/stop location tracking:', err);
      }
    })();

    return () => {
      alive = false;
      void safeStopBackgroundLocation();
    };
  }, [enabled]);
}
