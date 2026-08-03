/** Rider delivery status steps — simplified CASE rider track */

export type RiderDeliveryStatus =
  | 'PENDING'
  | 'RIDER_ASSIGNED'
  | 'ON_THE_WAY'
  | 'DELIVERED'
  | 'CANCELLED';

/**
 * Statuses an unassigned order can be accepted from — mirrors backend claim rules.
 */
const CLAIMABLE_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PAYMENT_APPROVED',
  'PREPARING',
  'READY_FOR_PICKUP',
];

/** Shop still preparing — rider already claimed early. */
const PRE_PICKUP_STATUSES = [
  'PENDING',
  'PENDING_PAYMENT_VERIFICATION',
  'PAYMENT_APPROVED',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'RIDER_ASSIGNED',
];

export function isClaimableOrder(order: {
  orderStatus: string;
  paymentStatus?: string | null;
  riderId?: unknown;
}): boolean {
  if (order.riderId) return false;
  if (CLAIMABLE_STATUSES.includes(order.orderStatus)) return true;
  if (order.orderStatus !== 'PENDING_PAYMENT_VERIFICATION') return false;
  const pay = String(order.paymentStatus ?? '').toUpperCase();
  return (
    pay === 'PENDING' ||
    pay === 'PENDING_VERIFICATION' ||
    pay === 'APPROVED' ||
    pay === 'CAPTURED' ||
    pay === 'COLLECTED'
  );
}

/** Rider-facing labels for the simplified track. */
export const RIDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  PENDING_PAYMENT_VERIFICATION: 'Pending',
  CONFIRMED: 'Pending — shop confirmed',
  PAYMENT_APPROVED: 'Pending — payment approved',
  PREPARING: 'Pending — shop preparing',
  READY_FOR_PICKUP: 'Pending — ready at shop',
  RIDER_ASSIGNED: 'Rider assigned',
  PICKED_UP: 'On the way',
  ON_THE_WAY: 'On the way',
  ARRIVED: 'On the way',
  DELIVERED: 'Delivered',
  COMPLETED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export type DeliveryStep = {
  status: RiderDeliveryStatus;
  label: string;
  description: string;
};

/** Visible rider progress: Pending → Assigned → On the way → Delivered */
export const DELIVERY_FLOW_STEPS: DeliveryStep[] = [
  {
    status: 'PENDING',
    label: 'Pending',
    description: 'Order placed — shop preparing',
  },
  {
    status: 'RIDER_ASSIGNED',
    label: 'Rider assigned',
    description: 'Head to the shop and collect the order',
  },
  {
    status: 'ON_THE_WAY',
    label: 'On the way',
    description: 'You have the order — head to campus drop-off',
  },
  {
    status: 'DELIVERED',
    label: 'Delivered',
    description: 'COD: collect cash · Bank: delivery done (payment may still verify)',
  },
];

export type RiderDeliveryAction = 'pickup' | 'arrived' | 'complete' | 'reject';

/**
 * Simplified rider actions:
 * Assigned/pending → swipe On the way (pickup)
 * On the way → swipe Deliver (complete)
 */
export function nextRiderAction(status: string): RiderDeliveryAction | null {
  if (PRE_PICKUP_STATUSES.includes(status)) return 'pickup';
  if (
    status === 'PICKED_UP' ||
    status === 'ON_THE_WAY' ||
    status === 'ARRIVED'
  ) {
    return 'complete';
  }
  return null;
}

/** Always allow complete — bank verification is async after delivery. */
export function canCompleteDelivery(_order: {
  paymentMethod?: string | null;
  paymentStatus?: string | null;
}): { ok: boolean; reason?: string } {
  return { ok: true };
}

export function actionButtonLabel(
  action: RiderDeliveryAction,
  order?: { paymentMethod?: string | null },
): string {
  switch (action) {
    case 'pickup':
      return 'On the way';
    case 'arrived':
      return 'On the way';
    case 'complete':
      return String(order?.paymentMethod ?? '').toUpperCase() === 'COD'
        ? 'Collect & deliver'
        : 'Confirm delivery';
    case 'reject':
      return 'Release order';
    default:
      return 'Update status';
  }
}

export function stepIndexForStatus(status: string): number {
  if (
    status === 'PENDING' ||
    status === 'PENDING_PAYMENT_VERIFICATION' ||
    status === 'CONFIRMED' ||
    status === 'PAYMENT_APPROVED' ||
    status === 'PREPARING' ||
    status === 'READY_FOR_PICKUP'
  ) {
    return 0;
  }
  if (status === 'RIDER_ASSIGNED') return 1;
  if (status === 'PICKED_UP' || status === 'ON_THE_WAY' || status === 'ARRIVED') return 2;
  if (status === 'DELIVERED' || status === 'COMPLETED') return 3;
  return -1;
}

/** Map rider UI actions to API order statuses */
export function statusForRiderAction(action: RiderDeliveryAction): string | null {
  if (action === 'pickup') return 'PICKED_UP';
  if (action === 'arrived') return 'ON_THE_WAY';
  if (action === 'complete') return 'DELIVERED';
  return null;
}
