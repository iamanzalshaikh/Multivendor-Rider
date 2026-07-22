export type LatLng = { latitude: number; longitude: number };

export function bearingDegrees(from: LatLng, to: LatLng): number {
  const φ1 = (from.latitude * Math.PI) / 180;
  const φ2 = (to.latitude * Math.PI) / 180;
  const Δλ = ((to.longitude - from.longitude) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function findLookAheadPoint(rider: LatLng, route: LatLng[], minIndexOffset = 3): LatLng | null {
  if (route.length < 2) return null;

  let nearestIdx = 0;
  let nearestDist = Infinity;
  for (let i = 0; i < route.length; i++) {
    const dLat = route[i].latitude - rider.latitude;
    const dLng = route[i].longitude - rider.longitude;
    const d = dLat * dLat + dLng * dLng;
    if (d < nearestDist) {
      nearestDist = d;
      nearestIdx = i;
    }
  }

  const lookIdx = Math.min(route.length - 1, nearestIdx + minIndexOffset);
  return route[lookIdx] ?? null;
}

export function resolveNavigationHeading(
  rider: LatLng,
  route: LatLng[],
  destination: LatLng | null,
  gpsHeading?: number,
): number {
  if (gpsHeading != null && gpsHeading >= 0 && gpsHeading <= 360) {
    return gpsHeading;
  }
  const ahead = findLookAheadPoint(rider, route);
  if (ahead) return bearingDegrees(rider, ahead);
  if (destination) return bearingDegrees(rider, destination);
  return 0;
}

export function splitRouteAtRider(route: LatLng[], rider?: LatLng | null) {
  if (!rider || route.length < 3) {
    return { traveled: [] as LatLng[], remaining: route };
  }

  let nearestIdx = 0;
  let nearestDist = Infinity;
  for (let i = 0; i < route.length; i++) {
    const dLat = route[i].latitude - rider.latitude;
    const dLng = route[i].longitude - rider.longitude;
    const d = dLat * dLat + dLng * dLng;
    if (d < nearestDist) {
      nearestDist = d;
      nearestIdx = i;
    }
  }

  const traveled = route.slice(0, nearestIdx + 1);
  const remaining =
    nearestIdx < route.length - 1
      ? [rider, ...route.slice(nearestIdx + 1)]
      : [rider, route[route.length - 1]];

  return { traveled, remaining };
}
