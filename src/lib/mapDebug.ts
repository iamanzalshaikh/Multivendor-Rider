import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

import { getNativeMapsApiKey, hasGoogleMapsConfigured } from '@/config/maps';
import { hasNativeMapsModule } from '@/lib/canUseNativeMaps';

const TAG = '🗺️ [RIDER MAP]';

function maskKey(key: string): string {
  if (!key) return '(missing)';
  if (key.length < 12) return '(set, too short)';
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

export function getMapsDebugSnapshot() {
  return {
    platform: Platform.OS,
    nativeLinked: hasNativeMapsModule(),
    nativeModules: {
      RNMapsAirModule: Boolean(NativeModules.RNMapsAirModule),
      AIRMapModule: Boolean(NativeModules.AIRMapModule),
      AIRMapManager: Boolean(NativeModules.AIRMapManager),
    },
    googleMapsKeyConfigured: hasGoogleMapsConfigured(),
    googleMapsKeyMasked: maskKey(getNativeMapsApiKey()),
    androidPackage: Constants.expoConfig?.android?.package ?? 'unknown',
    iosBundle: Constants.expoConfig?.ios?.bundleIdentifier ?? 'unknown',
  };
}

export function logMapDebug(context: string, extra?: Record<string, unknown>) {
  console.log(TAG, context, { ...getMapsDebugSnapshot(), ...extra });
}

/** Grey tiles + Google logo = Google rejected the API key (SHA-1 / package / billing). */
export function logGreyMapHint(context: string) {
  const snap = getMapsDebugSnapshot();
  console.warn(
    TAG,
    `${context} — grey map usually means Google Cloud rejected the API key.`,
    {
      fix: [
        '1. Enable "Maps SDK for Android" in Google Cloud',
        '2. Add Android restriction: package + SHA-1',
        `3. Package: ${snap.androidPackage}`,
        '4. SHA-1: cd android && gradlew.bat signingReport',
        '5. Billing must be enabled on the Google project',
      ],
      key: snap.googleMapsKeyMasked,
    },
  );
}

let greyHintTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleGreyMapHint(context: string, mapReady: boolean) {
  if (!__DEV__ || !mapReady) return;
  if (greyHintTimer) clearTimeout(greyHintTimer);
  greyHintTimer = setTimeout(() => logGreyMapHint(context), 3500);
}
