export const ClientSocketEvents = {
  JOIN_ORDER: 'join_order',
  LEAVE_ORDER: 'leave_order',
  RIDER_ONLINE: 'rider_online',
  RIDER_OFFLINE: 'rider_offline',
} as const;

export const ServerSocketEvents = {
  NEW_ORDER: 'new_order',
  ORDER_UPDATED: 'order_updated',
  ORDER_CONFIRMED: 'order_confirmed',
  RIDER_ASSIGNED: 'rider_assigned',
  RIDER_LOCATION_UPDATE: 'rider_location_update',
  ORDER_PICKED_UP: 'order_picked_up',
  ORDER_DELIVERED: 'order_delivered',
  ORDER_CANCELLED: 'order_cancelled',
  DELIVERY_AVAILABLE: 'delivery_available',
  DELIVERY_CLAIMED: 'delivery_claimed',
} as const;

export type OrderSocketPayload = {
  orderId?: string;
  orderStatus?: string;
  paymentStatus?: string;
  /** Delivery fee + tip — what the rider earns for this trip */
  riderEarning?: number;
  deliveryFee?: number;
  tipAmount?: number;
  orderNumber?: string;
  restaurantName?: string;
  grandTotal?: number;
  acceptTimeoutSeconds?: number;
  timestamp?: string;
};
