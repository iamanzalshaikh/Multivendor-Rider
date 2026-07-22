import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';

export type DeliveryMapProps = {
  customer?: { latitude: number; longitude: number } | null;
  restaurant?: { latitude: number; longitude: number } | null;
  rider?: { latitude: number; longitude: number } | null;
  riderHeading?: number;
  routePath?: Array<{ latitude: number; longitude: number }>;
  routeLoading?: boolean;
  height?: number;
  followRider?: boolean;
  fullScreen?: boolean;
  orderStatus?: string;
};

function hasAnyCoord(props: DeliveryMapProps) {
  return [props.customer, props.restaurant, props.rider].some(
    (c) => c && Number.isFinite(c.latitude) && Number.isFinite(c.longitude),
  );
}

export function DeliveryMapFallback({
  customer,
  restaurant,
  rider,
  height = 220,
}: DeliveryMapProps) {
  const message = !hasAnyCoord({ customer, restaurant, rider })
    ? 'Map will appear when pickup and drop coordinates are available.'
    : 'Rebuild with "npx expo run:android" for the full Google Map.';

  return (
    <View style={[styles.placeholder, { height }]}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.placeholderText}>
        {message}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: 'rgba(255,90,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  placeholderText: { textAlign: 'center', lineHeight: 18 },
});
