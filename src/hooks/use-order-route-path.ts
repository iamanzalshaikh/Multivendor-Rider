import { keepPreviousData, useQuery } from '@tanstack/react-query';

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
  const prePickup = ['RIDER_ASSIGNED', 'READY_FOR_PICKUP', 'PENDING', 'CONFIRMED', 'PREPARING', 'PENDING_PAYMENT_VERIFICATION'].includes(
    orderStatus ?? '',
  );
  const endpoints = resolveRouteEndpoints({ orderStatus, restaurant, customer, rider });

  const [apiPath, osrmActive] = await Promise.all([
    fetchOrderRoute(orderId).catch(() => [] as RoutePoint[]),
    endpoints ? fetchOsrmRoute(endpoints).catch(() => [] as RoutePoint[]) : Promise.resolve([] as RoutePoint[]),
  ]);
  if (isRoutedPath(apiPath)) return apiPath;
  if (isRoutedPath(osrmActive)) return osrmActive;

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

  // Do NOT put live GPS in the query key — it remounts forever and the spinner never stops.
  const restKey = restaurant
    ? `${restaurant.latitude.toFixed(3)},${restaurant.longitude.toFixed(3)}`
    : 'r';
  const custKey = customer
    ? `${customer.latitude.toFixed(3)},${customer.longitude.toFixed(3)}`
    : 'c';

  return useQuery({
    queryKey: ['rider-order-route', orderId, orderStatus, restKey, custKey],
    enabled: Boolean(orderId) && enabled && hasCoords,
    staleTime: 45_000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
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
