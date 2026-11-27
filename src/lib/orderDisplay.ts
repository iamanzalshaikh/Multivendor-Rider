import type { RiderOrder } from '@/types/rider';

export type RiderPickup = NonNullable<RiderOrder['pickups']>[number];

/** Every store the rider must visit (multi-store CASE orders). */
export function orderPickups(order: RiderOrder): RiderPickup[] {
  if (order.pickups?.length) return order.pickups;
  if (order.storeNames?.length) {
    return order.storeNames.map((restaurantName, i) => ({
      _id: `name-${i}`,
      restaurantName,
    }));
  }
  const primary = order.restaurantId;
  if (primary && typeof primary === 'object') return [primary];
  return [];
}

export function formatPickupNames(order: RiderOrder): string {
  const pickups = orderPickups(order);
  if (pickups.length) {
    return pickups.map((p) => p.restaurantName || 'Store').join(' · ');
  }
  return typeof order.restaurantId === 'object'
    ? order.restaurantId?.restaurantName ?? 'Restaurant'
    : 'Restaurant';
}

export function formatPickupAddress(pickup: RiderPickup): string {
  const nested = pickup.address;
  if (nested && typeof nested === 'object') {
    const line = [nested.street, nested.city].filter(Boolean).join(', ');
    if (line) return line;
  }
  const flat = [pickup.addressStreet, pickup.addressCity].filter(Boolean).join(', ');
  return flat || 'Restaurant address on file';
}

export function formatDeliveryAddress(order: RiderOrder): string {
  const point = (order as { deliveryPoint?: { name?: string; campus?: string } }).deliveryPoint;
  if (point?.name) {
    return point.campus ? `${point.name} (${point.campus})` : point.name;
  }
  const addr = order.customerAddress ?? order.deliveryAddress;
  if (order.customerAddress?.fullAddress) return order.customerAddress.fullAddress;
  return [addr?.street, addr?.city, addr?.pincode].filter(Boolean).join(', ') || 'Address on file';
}

export function formatRestaurantAddress(order: RiderOrder): string {
  const restaurant = order.restaurantId;
  if (typeof restaurant !== 'object' || !restaurant) return 'Address on file';
  const r = restaurant as {
    address?: { street?: string; city?: string };
    addressStreet?: string;
    addressCity?: string;
  };
  const nested = r.address;
  if (nested && typeof nested === 'object') {
    const line = [nested.street, nested.city].filter(Boolean).join(', ');
    if (line) return line;
  }
  const flat = [r.addressStreet, r.addressCity].filter(Boolean).join(', ');
  if (flat) return flat;
  return 'Restaurant address on file';
}

export function orderDisplayId(order: RiderOrder): string {
  return `#${order.orderNumber ?? order._id.slice(-6).toUpperCase()}`;
}

export function itemCount(order: RiderOrder): number {
  const items = order.items ?? order.orderItems ?? [];
  return items.reduce((sum, i) => sum + (i.quantity ?? 1), 0);
}

export function pickCoord(
  ...sources: Array<{ latitude?: number; longitude?: number } | null | undefined>
): { latitude: number; longitude: number } | null {
  for (const s of sources) {
    const lat = Number(s?.latitude);
    const lng = Number(s?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
      return { latitude: lat, longitude: lng };
    }
  }
  return null;
}

export function pickRestaurantCoord(order: RiderOrder): { latitude: number; longitude: number } | null {
  const restaurant = order.restaurantId;
  if (!restaurant || typeof restaurant !== 'object') return null;
  const r = restaurant as {
    latitude?: number;
    longitude?: number;
    location?: { coordinates?: number[] };
  };
  const direct = pickCoord({ latitude: r.latitude, longitude: r.longitude });
  if (direct) return direct;
  const coords = r.location?.coordinates;
  if (coords && coords.length >= 2) {
    return pickCoord({ latitude: coords[1], longitude: coords[0] });
  }
  return null;
}

export function pickCustomerCoord(order: RiderOrder): { latitude: number; longitude: number } | null {
  return pickCoord(order.customerAddress, order.deliveryAddress);
}

export function pickRiderCoord(
  gps: { latitude: number; longitude: number } | null | undefined,
  order?: RiderOrder | null,
): { latitude: number; longitude: number } | null {
  return pickCoord(gps, order?.riderLocation);
}
