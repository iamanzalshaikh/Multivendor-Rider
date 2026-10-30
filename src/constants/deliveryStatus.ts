/** Rider delivery status steps — CASE rider track */

export type RiderDeliveryStatus =
  | 'PENDING'
  | 'RIDER_ASSIGNED'
  | 'PROCESSING'
  | 'ON_THE_WAY'
  | 'ARRIVED'
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

/** Shop still preparing / rider heading to store — items not bought yet. */
const PRE_PURCHASE_STATUSES = [
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

/** Rider-facing labels for the delivery track. */
export const RIDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  PENDING_PAYMENT_VERIFICATION: 'Pending',
  CONFIRMED: 'Pending — shop confirmed',
  PAYMENT_APPROVED: 'Pending — payment approved',
  PREPARING: 'Pending — shop preparing',
  READY_FOR_PICKUP: 'Pending — ready at shop',
  RIDER_ASSIGNED: 'Head to store',
  PROCESSING: 'Processing',
  PICKED_UP: 'Processing',
  ON_THE_WAY: 'On the way',
  ARRIVED: 'Arrived',
  DELIVERED: 'Delivered',
  COMPLETED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export type DeliveryStep = {
  status: RiderDeliveryStatus;
  label: string;
  /** Compact label for the progress rail (avoids overlap). */
  shortLabel: string;
  description: string;
};

/** Visible rider progress: Assigned → Processing → On the way → Arrived → Delivered */
export const DELIVERY_FLOW_STEPS: DeliveryStep[] = [
  {
    status: 'PENDING',
    label: 'Pending',
    shortLabel: 'Pending',
    description: 'Order placed — head to the store when assigned',
  },
  {
    status: 'RIDER_ASSIGNED',
    label: 'Rider assigned',
    shortLabel: 'Assigned',
    description: 'Head to the store and buy/collect the items',
  },
  {
    status: 'PROCESSING',
    label: 'Processing',
    shortLabel: 'Process',
    description: 'Items bought — pack and start the delivery',
  },
  {
    status: 'ON_THE_WAY',
    label: 'On the way',
    shortLabel: 'En route',
    description: 'En route to the customer drop-off',
  },
  {
    status: 'ARRIVED',
    label: 'Arrived',
    shortLabel: 'Arrived',
    description: 'You have arrived at the customer location',
  },
  {
    status: 'DELIVERED',
    label: 'Delivered',
    shortLabel: 'Done',
    description: 'COD: collect cash · Bank: delivery done (payment may still verify)',
  },
];

export type RiderDeliveryAction =
  | 'processing'
  | 'on_the_way'
  | 'arrived'
  | 'complete'
  | 'reject'
  /** @deprecated use processing */
  | 'pickup';

export const DEFAULT_ETA_MINUTES = 15;
export const ETA_STEP_MINUTES = 5;
export const ETA_MIN_MINUTES = 5;
export const ETA_MAX_MINUTES = 60;

/**
 * Assigned → Processing
 * Processing → On the way (with ETA)
 * On the way → Arrived
 * Arrived → Complete
 */
export function nextRiderAction(status: string): RiderDeliveryAction | null {
  if (PRE_PURCHASE_STATUSES.includes(status)) return 'processing';
  if (status === 'PROCESSING' || status === 'PICKED_UP') return 'on_the_way';
  if (status === 'ON_THE_WAY') return 'arrived';
  if (status === 'ARRIVED') return 'complete';
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
    case 'processing':
    case 'pickup':
      return 'Processing';
    case 'on_the_way':
      return 'Start delivery';
    case 'arrived':
      return 'Mark arrived';
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
  if (status === 'PROCESSING' || status === 'PICKED_UP') return 2;
  if (status === 'ON_THE_WAY') return 3;
  if (status === 'ARRIVED') return 4;
  if (status === 'DELIVERED' || status === 'COMPLETED') return 5;
  return -1;
}

/** Map rider UI actions to API order statuses */
export function statusForRiderAction(action: RiderDeliveryAction): string | null {
  if (action === 'processing' || action === 'pickup') return 'PROCESSING';
  if (action === 'on_the_way') return 'ON_THE_WAY';
  if (action === 'arrived') return 'ARRIVED';
  if (action === 'complete') return 'DELIVERED';
  return null;
}
