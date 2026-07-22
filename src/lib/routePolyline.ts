export type RoutePoint = { latitude: number; longitude: number };

export function isValidRoutePoint(p?: RoutePoint | null): p is RoutePoint {
  return (
    !!p &&
    Number.isFinite(p.latitude) &&
    Number.isFinite(p.longitude) &&
    !(p.latitude === 0 && p.longitude === 0)
  );
}

/** Client-side OSRM fallback when the API returns no road geometry. */
export async function fetchOsrmRoute(input: {
  origin: RoutePoint;
  destination: RoutePoint;
  waypoints?: RoutePoint[];
}): Promise<RoutePoint[]> {
  const stops = [input.origin, ...(input.waypoints ?? []), input.destination];
  if (stops.length < 2) return [];

  const coordStr = stops.map((p) => `${p.longitude},${p.latitude}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = (await res.json()) as {
    routes?: Array<{ geometry?: { coordinates?: [number, number][] } }>;
  };

  const coords = data.routes?.[0]?.geometry?.coordinates;
  if (!coords?.length) return [];

  return coords.map(([longitude, latitude]) => ({ latitude, longitude }));
}

export function isRoutedPath(path?: RoutePoint[] | null): path is RoutePoint[] {
  return Array.isArray(path) && path.length >= 3;
}

export function isDrawablePath(path?: RoutePoint[] | null): path is RoutePoint[] {
  return Array.isArray(path) && path.length >= 2;
}

const COORD_EPS = 0.00005;

export function dedupePath(points: RoutePoint[]): RoutePoint[] {
  return points.filter((p, i, arr) => {
    if (i === 0) return true;
    const prev = arr[i - 1];
    return (
      Math.abs(prev.latitude - p.latitude) > COORD_EPS ||
      Math.abs(prev.longitude - p.longitude) > COORD_EPS
    );
  });
}

export function mergePaths(...paths: Array<RoutePoint[] | null | undefined>): RoutePoint[] {
  const out: RoutePoint[] = [];
  for (const path of paths) {
    if (!path?.length) continue;
    for (const p of path) {
      if (out.length === 0) {
        out.push(p);
        continue;
      }
      const prev = out[out.length - 1];
      if (
        Math.abs(prev.latitude - p.latitude) > COORD_EPS ||
        Math.abs(prev.longitude - p.longitude) > COORD_EPS
      ) {
        out.push(p);
      }
    }
  }
  return out;
}

/** Visible line across pickup / rider / drop — always at least 2 distinct stops. */
export function buildMapDisplayPath(input: {
  orderStatus?: string;
  restaurant?: RoutePoint | null;
  customer?: RoutePoint | null;
  rider?: RoutePoint | null;
}): RoutePoint[] {
  const { orderStatus, restaurant, customer, rider } = input;
  const r = isValidRoutePoint(restaurant) ? restaurant : null;
  const c = isValidRoutePoint(customer) ? customer : null;
  const u = isValidRoutePoint(rider) ? rider : null;
  const prePickup = ['RIDER_ASSIGNED', 'READY_FOR_PICKUP'].includes(orderStatus ?? '');

  if (prePickup && u && r && c) return dedupePath([u, r, c]);
  if (u && c) return dedupePath([u, c]);
  if (u && r) return dedupePath([u, r]);
  if (r && c) return dedupePath([r, c]);
  return buildFallbackRoute(input);
}

function pathSpanKm(path: RoutePoint[]): number {
  if (path.length < 2) return 0;
  let km = 0;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
    const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((a.latitude * Math.PI) / 180) *
        Math.cos((b.latitude * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    km += 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }
  return km;
}

/** Pick the best path to draw — prefer long road geometry, else full trip guide line. */
export function resolveMapRoutePath(input: {
  orderStatus?: string;
  restaurant?: RoutePoint | null;
  customer?: RoutePoint | null;
  rider?: RoutePoint | null;
  roadPath?: RoutePoint[] | null;
}): RoutePoint[] {
  const guide = buildMapDisplayPath(input);
  const road = input.roadPath ?? [];
  const prePickup = ['RIDER_ASSIGNED', 'READY_FOR_PICKUP'].includes(input.orderStatus ?? '');
  const guideKm = pathSpanKm(guide);
  const roadKm = pathSpanKm(road);

  if (prePickup && guide.length >= 3) {
    if (!isRoutedPath(road) || roadKm < guideKm * 0.85) return guide;
  }

  if (isRoutedPath(road)) return road;
  if (isDrawablePath(road) && roadKm >= 0.2) return road;
  if (isDrawablePath(road) && guide.length < 2) return road;

  return guide.length >= 2 ? guide : road;
}

/** Add intermediate points so Google Maps draws visible polylines on straight segments. */
export function densifyPath(path: RoutePoint[], stepsPerLeg = 12): RoutePoint[] {
  if (path.length < 2) return path;
  if (path.length >= 24) return path;

  const out: RoutePoint[] = [path[0]];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    for (let s = 1; s <= stepsPerLeg; s++) {
      const t = s / stepsPerLeg;
      out.push({
        latitude: a.latitude + (b.latitude - a.latitude) * t,
        longitude: a.longitude + (b.longitude - a.longitude) * t,
      });
    }
  }
  return out;
}

/** Straight-line fallback when road routing is unavailable. */
export function buildFallbackRoute(input: {
  orderStatus?: string;
  restaurant?: RoutePoint | null;
  customer?: RoutePoint | null;
  rider?: RoutePoint | null;
}): RoutePoint[] {
  const endpoints = resolveRouteEndpoints(input);
  if (endpoints) {
    const stops = [endpoints.origin, ...(endpoints.waypoints ?? []), endpoints.destination];
    return stops.filter((p, i, arr) => {
      if (i === 0) return true;
      const prev = arr[i - 1];
      return prev.latitude !== p.latitude || prev.longitude !== p.longitude;
    });
  }

  const path: RoutePoint[] = [];
  if (isValidRoutePoint(input.restaurant)) path.push(input.restaurant);
  if (isValidRoutePoint(input.rider)) path.push(input.rider);
  if (isValidRoutePoint(input.customer)) path.push(input.customer);
  return path.length >= 2 ? path : [];
}

export function resolveRouteEndpoints(input: {
  orderStatus?: string;
  restaurant?: RoutePoint | null;
  customer?: RoutePoint | null;
  rider?: RoutePoint | null;
}): { origin: RoutePoint; destination: RoutePoint; waypoints?: RoutePoint[] } | null {
  const { orderStatus, restaurant, customer, rider } = input;
  const r = isValidRoutePoint(restaurant) ? restaurant : null;
  const c = isValidRoutePoint(customer) ? customer : null;
  const u = isValidRoutePoint(rider) ? rider : null;

  if (['PICKED_UP', 'ON_THE_WAY'].includes(orderStatus ?? '') && u && c) {
    return { origin: u, destination: c };
  }
  if (['RIDER_ASSIGNED', 'READY_FOR_PICKUP'].includes(orderStatus ?? '') && u && r) {
    return { origin: u, destination: r };
  }
  if (r && c) {
    return { origin: r, destination: c, waypoints: u ? [u] : undefined };
  }
  if (r && u) return { origin: r, destination: u };
  if (u && c) return { origin: u, destination: c };
  return null;
}
