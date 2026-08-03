/**
 * Background location task for the rider app.
 *
 * Must not touch expo-task-manager until the Expo native runtime has installed
 * `globalThis.expo` — otherwise startup crashes with:
 *   TypeError: Cannot read property 'EventEmitter' of undefined
 */

export const RIDER_LOCATION_TASK = 'rider-background-location';

let registered = false;

function isExpoRuntimeReady(): boolean {
  try {
    return typeof globalThis !== 'undefined' && (globalThis as { expo?: unknown }).expo != null;
  } catch {
    return false;
  }
}

/** Idempotent — call from root layout after mount and before starting updates. */
export function ensureRiderLocationTaskRegistered(): boolean {
  if (registered) return true;
  if (!isExpoRuntimeReady()) return false;

  try {
    // Lazy require so Metro doesn't evaluate EventEmitter during the first tick.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TaskManager = require('expo-task-manager') as typeof import('expo-task-manager');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Location = require('expo-location') as typeof import('expo-location');

    TaskManager.defineTask(RIDER_LOCATION_TASK, async ({ data, error }) => {
      if (error) return;

      const locations = (data as { locations?: import('expo-location').LocationObject[] })?.locations;
      const loc = locations?.[0];
      if (!loc) return;

      try {
        const { updateRiderLocation } = await import('@/services/riders');
        await updateRiderLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          speed: loc.coords.speed ?? undefined,
          heading: loc.coords.heading ?? undefined,
        });
      } catch {
        // ignore transient network errors
      }
    });

    registered = true;
    void Location; // keep type side for LocationObject
    return true;
  } catch (err) {
    console.warn('[riderLocationTask] defineTask failed', err);
    return false;
  }
}

/** Schedule registration as soon as the Expo runtime is available. */
export function scheduleRiderLocationTaskRegistration() {
  if (ensureRiderLocationTaskRegistered()) return;

  let attempts = 0;
  const maxAttempts = 40;
  const tick = () => {
    attempts += 1;
    if (ensureRiderLocationTaskRegistered() || attempts >= maxAttempts) return;
    setTimeout(tick, 50);
  };
  setTimeout(tick, 0);
}
