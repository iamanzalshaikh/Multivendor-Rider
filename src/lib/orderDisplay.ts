import type { RiderOrder } from '@/types/rider';

export function formatDeliveryAddress(order: RiderOrder): string {
  const addr = order.customerAddress ?? order.deliveryAddress;
  if (order.customerAddress?.fullAddress) return order.customerAddress.fullAddress;
  return [addr?.street, addr?.city, addr?.pincode].filter(Boolean).join(', ') || 'Address on file';
}

export function formatRestaurantAddress(order: RiderOrder): string {
  const restaurant = order.restaurantId;
  if (typeof restaurant !== 'object' || !restaurant) return 'Address on file';
  const addr = restaurant.address;
  if (addr && typeof addr === 'object') {
    const line = [addr.street, addr.city].filter(Boolean).join(', ');
    if (line) return line;
  }
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
