/**
 * Ensure Expo native globals exist before the router / app modules load.
 * Fixes: TypeError: Cannot read property 'EventEmitter' of undefined
 */
import 'expo';

// Live location task registration disabled — status updates only.
// Re-enable with V1_LIVE_LOCATION_ENABLED + scheduleRiderLocationTaskRegistration().

// Load router entry after Expo runtime bootstrap.
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('expo-router/entry');
