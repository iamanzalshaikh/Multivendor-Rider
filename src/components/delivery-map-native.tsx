import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { TrackingMarker } from '@/components/map/tracking-markers';
import type { DeliveryMapProps } from '@/components/delivery-map-fallback';
import { Brand } from '@/constants/theme';
import { buildMapDisplayPath, isRoutedPath } from '@/lib/routePolyline';
import { logMapDebug, scheduleGreyMapHint } from '@/lib/mapDebug';
import {
  resolveNavigationHeading,
  splitRouteAtRider,
  type LatLng,
} from '@/lib/mapNavigation';

const ROUTE_ACTIVE = Brand.orange;
const ROUTE_CASING = '#ffffff';
const ROUTE_TRAVELED = '#9ca3af';
const NAV_ZOOM = 16.5;
const NAV_PITCH = Platform.OS === 'ios' ? 45 : 0;

const DEFAULT_REGION = {
  latitude: 19.2403,
  longitude: 73.1307,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

function isValidCoord(c?: LatLng | null): c is LatLng {
  return (
    !!c &&
    Number.isFinite(c.latitude) &&
    Number.isFinite(c.longitude) &&
    !(c.latitude === 0 && c.longitude === 0)
  );
}

function regionFromPoints(points: LatLng[]) {
  if (points.length === 0) return DEFAULT_REGION;
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.02, (maxLat - minLat) * 1.6 + 0.015),
    longitudeDelta: Math.max(0.02, (maxLng - minLng) * 1.6 + 0.015),
  };
}

function collectFitCoords(points: LatLng[], route: LatLng[]) {
  const all = [...points];
  if (route.length >= 2) all.push(...route);
  return all;
}

export function DeliveryMapNative({
  customer,
  restaurant,
  rider,
  riderHeading,
  routePath,
  routeLoading = false,
  height = 220,
  followRider = false,
  fullScreen = false,
  orderStatus,
}: DeliveryMapProps) {
  const mapRef = useRef<MapView>(null);
  const [userPanned, setUserPanned] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hasLayout, setHasLayout] = useState(false);
  const lastFitKey = useRef('');
  const lastCameraMs = useRef(0);

  const markerPoints = useMemo(() => {
    const list: LatLng[] = [];
    if (isValidCoord(restaurant)) list.push(restaurant);
    if (isValidCoord(rider)) list.push(rider);
    if (isValidCoord(customer)) list.push(customer);
    return list;
  }, [customer, restaurant, rider]);

  const guideLine = useMemo(
    () => buildMapDisplayPath({ orderStatus, restaurant, customer, rider }),
    [orderStatus, restaurant, customer, rider],
  );

  /** Prefer road polyline from API/OSRM; straight line only as last resort. */
  const lineCoords = useMemo(() => {
    if (routePath && isRoutedPath(routePath)) return routePath;

    const throughStops: LatLng[] = [];
    if (isValidCoord(restaurant)) throughStops.push(restaurant);
    if (isValidCoord(rider)) throughStops.push(rider);
    if (isValidCoord(customer)) throughStops.push(customer);

    return throughStops.length >= 2 ? throughStops : guideLine;
  }, [routePath, restaurant, rider, customer, guideLine]);

  const initialRegion = useMemo(
    () => regionFromPoints(collectFitCoords(markerPoints, lineCoords)),
    [markerPoints, lineCoords],
  );

  const destination = useMemo(() => {
    if (['PICKED_UP', 'ON_THE_WAY'].includes(orderStatus ?? '') && isValidCoord(customer)) {
      return customer;
    }
    if (
      ['RIDER_ASSIGNED', 'READY_FOR_PICKUP'].includes(orderStatus ?? '') &&
      isValidCoord(restaurant)
    ) {
      return restaurant;
    }
    if (isValidCoord(customer)) return customer;
    if (isValidCoord(restaurant)) return restaurant;
    return null;
  }, [customer, restaurant, orderStatus]);

  const canControlCamera = mapReady && hasLayout;
  const navigationMode = followRider && fullScreen && navigating;

  const { traveled, remaining } = useMemo(() => {
    if (navigationMode && lineCoords.length >= 3 && isValidCoord(rider)) {
      return splitRouteAtRider(lineCoords, rider);
    }
    return { traveled: [] as LatLng[], remaining: lineCoords };
  }, [navigationMode, lineCoords, rider]);

  const fitTargets = useMemo(
    () => collectFitCoords(markerPoints, lineCoords),
    [markerPoints, lineCoords],
  );

  const fitKey = useMemo(
    () =>
      fitTargets
        .map((p) => `${p.latitude.toFixed(4)},${p.longitude.toFixed(4)}`)
        .join('|'),
    [fitTargets],
  );

  const fitOverview = useCallback(() => {
    if (!mapRef.current || !canControlCamera || fitTargets.length === 0) return;
    mapRef.current.fitToCoordinates(fitTargets, {
      edgePadding: { top: fullScreen ? 120 : 56, right: 56, bottom: fullScreen ? 160 : 56, left: 56 },
      animated: false,
    });
    setUserPanned(false);
    setNavigating(false);
  }, [fitTargets, fullScreen, canControlCamera]);

  const followNavigationCamera = useCallback(() => {
    if (!mapRef.current || !canControlCamera || !isValidCoord(rider)) return;

    const now = Date.now();
    if (now - lastCameraMs.current < 450) return;
    lastCameraMs.current = now;

    const heading = resolveNavigationHeading(rider, lineCoords, destination, riderHeading);

    if (Platform.OS === 'android') {
      mapRef.current.animateCamera({ center: rider, heading, zoom: NAV_ZOOM }, { duration: 180 });
      return;
    }

    mapRef.current.animateCamera(
      { center: rider, heading, pitch: NAV_PITCH, zoom: NAV_ZOOM },
      { duration: 180 },
    );
  }, [rider, lineCoords, destination, riderHeading, canControlCamera]);

  const startNavigation = useCallback(() => {
    setUserPanned(false);
    setNavigating(true);
    if (isValidCoord(rider)) followNavigationCamera();
  }, [rider, followNavigationCamera]);

  useEffect(() => {
    if (!canControlCamera || fitTargets.length === 0) return;
    if (fitKey === lastFitKey.current) return;

    lastFitKey.current = fitKey;
    fitOverview();
  }, [canControlCamera, fitKey, fitTargets.length, fitOverview]);

  useEffect(() => {
    if (!canControlCamera || !navigationMode || userPanned || !isValidCoord(rider)) return;
    followNavigationCamera();
  }, [canControlCamera, navigationMode, userPanned, rider, followNavigationCamera]);

  const mapHeight = fullScreen ? undefined : height;
  const activeLine = remaining.length >= 2 ? remaining : lineCoords;
  const hasLine = activeLine.length >= 2;
  const showCoordHint = mapReady && markerPoints.length === 0;
  const canNavigate = followRider && fullScreen && isValidCoord(rider) && hasLine;
  const lineKey = activeLine.map((p) => `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`).join(';');
  const mapProvider = Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined;

  useEffect(() => {
    logMapDebug('DeliveryMapNative mount', {
      provider: mapProvider ?? 'default',
      fullScreen,
      followRider,
      orderStatus,
      markers: {
        restaurant: isValidCoord(restaurant),
        rider: isValidCoord(rider),
        customer: isValidCoord(customer),
      },
      initialRegion,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- log once on mount
  }, []);

  useEffect(() => {
    if (mapReady) {
      logMapDebug('onMapReady fired', { hasLayout, markerCount: markerPoints.length });
      scheduleGreyMapHint('Trip map', true);
    }
  }, [mapReady, hasLayout, markerPoints.length]);

  useEffect(() => {
    if (mapLoaded) {
      logMapDebug('onMapLoaded — tiles should be visible now');
    }
  }, [mapLoaded]);

  return (
    <View
      style={[styles.wrap, fullScreen ? styles.wrapFull : { height: mapHeight }]}
      onLayout={(e) => {
        const { width, height: h } = e.nativeEvent.layout;
        setHasLayout(width > 0 && h > 0);
      }}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        provider={mapProvider}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        rotateEnabled={navigationMode}
        pitchEnabled={Platform.OS === 'ios' && navigationMode}
        loadingEnabled
        onMapReady={() => setMapReady(true)}
        onMapLoaded={() => setMapLoaded(true)}
        onPanDrag={() => {
          setUserPanned(true);
          setNavigating(false);
        }}
        moveOnMarkerPress={false}
      >
        {hasLine ? (
          <>
            <Polyline
              key={`casing-${lineKey}`}
              coordinates={activeLine}
              strokeColor={ROUTE_CASING}
              strokeWidth={8}
            />
            <Polyline
              key={`route-${lineKey}`}
              coordinates={activeLine}
              strokeColor={ROUTE_ACTIVE}
              strokeWidth={5}
            />
          </>
        ) : null}

        {traveled.length >= 2 ? (
          <Polyline
            key={`traveled-${lineKey}`}
            coordinates={traveled}
            strokeColor={ROUTE_TRAVELED}
            strokeWidth={5}
          />
        ) : null}

        {isValidCoord(restaurant) ? (
          <TrackingMarker kind="restaurant" coordinate={restaurant} zIndex={3} />
        ) : null}
        {isValidCoord(customer) ? (
          <TrackingMarker kind="customer" coordinate={customer} zIndex={3} />
        ) : null}
        {isValidCoord(rider) ? (
          <TrackingMarker
            kind="rider"
            coordinate={rider}
            zIndex={10}
            heading={navigationMode ? 0 : riderHeading}
            navigationPov={navigationMode}
          />
        ) : null}
      </MapView>

      {__DEV__ && mapReady ? (
        <View
          style={[styles.devBanner, fullScreen ? styles.devBannerFull : styles.devBannerEmbed]}
          pointerEvents="none">
          <Text style={styles.devBannerText}>
            {mapLoaded ? 'Map loaded' : 'Map ready — waiting for tiles…'}
            {markerPoints.length === 0 ? ' · no coords' : ` · ${markerPoints.length} pins`}
          </Text>
        </View>
      ) : null}

      {showCoordHint ? (
        <View style={styles.coordHint} pointerEvents="none">
          <Text style={styles.coordHintText}>
            Waiting for GPS and order coordinates…
          </Text>
        </View>
      ) : null}

      {routeLoading && mapReady ? (
        <View style={styles.routeLoading} pointerEvents="none">
          <ActivityIndicator color={ROUTE_ACTIVE} size="small" />
        </View>
      ) : null}

      {mapReady && markerPoints.length > 0 ? (
        <View style={styles.markerLegend} pointerEvents="none">
          <Text style={styles.markerLegendText}>
            {isValidCoord(restaurant) ? '● Pickup  ' : ''}
            {isValidCoord(rider) ? '● You  ' : ''}
            {isValidCoord(customer) ? '● Drop' : ''}
          </Text>
        </View>
      ) : null}

      {navigationMode && userPanned && mapReady ? (
        <Pressable style={styles.resumeNavBtn} onPress={startNavigation}>
          <Ionicons name="navigate" size={16} color="#fff" />
          <Text style={styles.resumeNavText}>Resume navigation</Text>
        </Pressable>
      ) : null}

      {canNavigate && !navigationMode && mapReady ? (
        <Pressable
          style={[styles.startNavBtn, fullScreen && styles.startNavBtnFull]}
          onPress={startNavigation}>
          <Ionicons name="navigate" size={16} color="#fff" />
          <Text style={styles.resumeNavText}>Follow route</Text>
        </Pressable>
      ) : null}

      {mapReady ? (
        <Pressable
          style={[styles.recenterBtn, fullScreen && styles.recenterBtnFull]}
          onPress={fitOverview}
          hitSlop={8}>
          <Ionicons name="scan-outline" size={18} color="#1a1c1c" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#e8e8e8',
  },
  wrapFull: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 0,
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  coordHint: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  coordHintText: { fontSize: 12, color: '#586062', fontWeight: '600', textAlign: 'center' },
  markerLegend: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  markerLegendText: { fontSize: 11, color: '#1a1c1c', fontWeight: '700' },
  recenterBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  recenterBtnFull: { bottom: 88 },
  routeLoading: {
    position: 'absolute',
    top: 12,
    right: 64,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  resumeNavBtn: {
    position: 'absolute',
    top: 48,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Brand.orange,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    elevation: 4,
  },
  startNavBtn: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Brand.orange,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    elevation: 4,
  },
  startNavBtnFull: { bottom: 88 },
  resumeNavText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  devBanner: {
    position: 'absolute',
    left: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  devBannerFull: { bottom: 140 },
  devBannerEmbed: { bottom: 56 },
  devBannerText: { color: '#fff', fontSize: 10, textAlign: 'center' },
});
