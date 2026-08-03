/**
 * Ensure Expo native globals exist before the router / app modules load.
 * Fixes: TypeError: Cannot read property 'EventEmitter' of undefined
 */
import 'expo';

// Register background task only after expo is imported (lazy require inside).
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('./src/tasks/riderLocationTask').scheduleRiderLocationTaskRegistration();

// Load router entry after Expo runtime bootstrap.
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('expo-router/entry');
