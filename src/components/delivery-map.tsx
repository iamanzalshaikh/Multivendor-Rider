import type { ComponentType } from 'react';

import { MapErrorBoundary } from '@/components/map/MapErrorBoundary';
import { DeliveryMapFallback, type DeliveryMapProps } from '@/components/delivery-map-fallback';
import { hasNativeMapsModule } from '@/lib/canUseNativeMaps';
import { logMapDebug } from '@/lib/mapDebug';

export type { DeliveryMapProps };

let NativeDeliveryMap: ComponentType<DeliveryMapProps> | null = null;

if (hasNativeMapsModule()) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    NativeDeliveryMap = require('@/components/delivery-map-native').DeliveryMapNative;
  } catch {
    NativeDeliveryMap = null;
  }
}

export function DeliveryMap(props: DeliveryMapProps) {
  if (!NativeDeliveryMap) {
    if (__DEV__) {
      logMapDebug('Using fallback — native maps module not linked', {
        hint: 'Run: npx expo run:android --device (not Expo Go)',
      });
    }
    return <DeliveryMapFallback {...props} />;
  }
  return (
    <MapErrorBoundary fullScreen={props.fullScreen} height={props.height ?? 220}>
      <NativeDeliveryMap {...props} />
    </MapErrorBoundary>
  );
}
