import { useEffect } from 'react';
import * as Location from 'expo-location';

import {
  ensureRiderLocationTaskRegistered,
  RIDER_LOCATION_TASK,
} from '@/tasks/riderLocationTask';

/** Live GPS broadcast is off for now — status updates only. */
export const V1_LIVE_LOCATION_ENABLED = false;

async function safeStopBackgroundLocation(): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TaskManager = require('expo-task-manager') as typeof import('expo-task-manager');
    if (!TaskManager.isTaskDefined(RIDER_LOCATION_TASK)) return;
    const started = await Location.hasStartedLocationUpdatesAsync(RIDER_LOCATION_TASK);
    if (started) await Location.stopLocationUpdatesAsync(RIDER_LOCATION_TASK);
  } catch {
    // Ignore TaskNotFound or transient native-state race during app boot/reload.
  }
}

/**
 * When enabled, starts background GPS for active trips.
 * Currently hard-disabled — always stops any leftover foreground-service notification.
 */
export function useRiderLocationTracking(enabled: boolean) {
  useEffect(() => {
    let alive = true;

    (async () => {
      // Always tear down leftover tracking (old builds left the orange notification).
      await safeStopBackgroundLocation();
      if (!V1_LIVE_LOCATION_ENABLED || !enabled || !alive) return;

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
    })();

    return () => {
      alive = false;
      void safeStopBackgroundLocation();
    };
  }, [enabled]);
}
