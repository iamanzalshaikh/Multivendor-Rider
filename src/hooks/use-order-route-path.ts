import { useQuery } from '@tanstack/react-query';

import {
  buildMapDisplayPath,
  fetchOsrmRoute,
  isDrawablePath,
  isRoutedPath,
  isValidRoutePoint,
  mergePaths,
  resolveRouteEndpoints,
  type RoutePoint,
} from '@/lib/routePolyline';
import { fetchOrderRoute } from '@/services/riders';

type Args = {
  orderId?: string;
  orderStatus?: string;
  restaurant?: RoutePoint | null;
  customer?: RoutePoint | null;
  rider?: RoutePoint | null;
  enabled?: boolean;
};

async function fetchRoadRoute(input: {
  orderId: string;
  orderStatus?: string;
  restaurant?: RoutePoint | null;
  customer?: RoutePoint | null;
  rider?: RoutePoint | null;
}): Promise<RoutePoint[]> {
  const { orderId, orderStatus, restaurant, customer, rider } = input;
  const prePickup = ['RIDER_ASSIGNED', 'READY_FOR_PICKUP'].includes(orderStatus ?? '');
  const endpoints = resolveRouteEndpoints({ orderStatus, restaurant, customer, rider });

  // 1) Backend: Google Routes API → OSRM fallback
  const apiPath = await fetchOrderRoute(orderId).catch(() => [] as RoutePoint[]);
  if (isRoutedPath(apiPath)) return apiPath;

  // 2) Client OSRM for active leg
  const osrmActive = endpoints ? await fetchOsrmRoute(endpoints).catch(() => [] as RoutePoint[]) : [];
  if (isRoutedPath(osrmActive)) return osrmActive;

  // 3) Before pickup: merge rider→restaurant + restaurant→customer roads
  if (prePickup && isValidRoutePoint(rider) && isValidRoutePoint(restaurant) && isValidRoutePoint(customer)) {
    const [toPickup, pickupToDrop] = await Promise.all([
      fetchOsrmRoute({ origin: rider!, destination: restaurant! }).catch(() => [] as RoutePoint[]),
      fetchOsrmRoute({ origin: restaurant!, destination: customer! }).catch(() => [] as RoutePoint[]),
    ]);
    const merged = mergePaths(toPickup, pickupToDrop);
    if (isRoutedPath(merged)) return merged;
  }

  if (isDrawablePath(apiPath)) return apiPath;
  if (isDrawablePath(osrmActive)) return osrmActive;

  return buildMapDisplayPath({ orderStatus, restaurant, customer, rider });
}

export function useOrderRoutePath({
  orderId,
  orderStatus,
  restaurant,
  customer,
  rider,
  enabled = true,
}: Args) {
  const hasCoords =
    isValidRoutePoint(restaurant) || isValidRoutePoint(customer) || isValidRoutePoint(rider);

  const riderKey = rider
    ? `${Math.round(rider.latitude * 200)}_${Math.round(rider.longitude * 200)}`
    : 'none';

  return useQuery({
    queryKey: ['rider-order-route', orderId, orderStatus, riderKey],
    enabled: Boolean(orderId) && enabled && hasCoords,
    staleTime: 45_000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchInterval: 60_000,
    queryFn: () =>
      fetchRoadRoute({
        orderId: orderId!,
        orderStatus,
        restaurant,
        customer,
        rider,
      }),
  });
}
