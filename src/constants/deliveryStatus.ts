/** Rider delivery status steps — aligned with CASE order flow */

export type RiderDeliveryStatus =
  | 'READY_FOR_PICKUP'
  | 'RIDER_ASSIGNED'
  | 'PICKED_UP'
  | 'ON_THE_WAY'
  | 'ARRIVED'
  | 'DELIVERED'
  | 'CANCELLED';

/**
 * Statuses an unassigned order can be accepted from — mirrors isRiderClaimableOrder()
 * in the backend. Online orders sit in PENDING_PAYMENT_VERIFICATION while an admin
 * checks the receipt, and the delivery runs ahead of that check.
 */
const CLAIMABLE_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PAYMENT_APPROVED',
  'PREPARING',
  'READY_FOR_PICKUP',
];

export function isClaimableOrder(order: {
  orderStatus: string;
  paymentStatus?: string | null;
  riderId?: unknown;
}): boolean {
  if (order.riderId) return false;
  if (CLAIMABLE_STATUSES.includes(order.orderStatus)) return true;
  return (
    order.orderStatus === 'PENDING_PAYMENT_VERIFICATION' &&
    order.paymentStatus === 'PENDING_VERIFICATION'
  );
}

export const RIDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Available — accept to start',
  PENDING_PAYMENT_VERIFICATION: 'Available — online payment verifying',
  CONFIRMED: 'Confirmed',
  PAYMENT_APPROVED: 'Payment approved',
  PREPARING: 'Restaurant preparing',
  READY_FOR_PICKUP: 'Ready for pickup',
  RIDER_ASSIGNED: 'Assigned — go to restaurant',
  PICKED_UP: 'Rider picked order',
  ON_THE_WAY: 'On the way',
  ARRIVED: 'Reached destination',
  DELIVERED: 'Collected',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export type DeliveryStep = {
  status: RiderDeliveryStatus;
  label: string;
  description: string;
};

export const DELIVERY_FLOW_STEPS: DeliveryStep[] = [
  {
    status: 'RIDER_ASSIGNED',
    label: 'Rider assigned',
    description: 'Head to the restaurant and collect the order',
  },
  {
    status: 'PICKED_UP',
    label: 'Rider picked order',
    description: 'Confirm you collected the order from the restaurant',
  },
  {
    status: 'ARRIVED',
    label: 'Reached destination',
    description: 'Confirm you arrived at the campus drop-off',
  },
  {
    status: 'DELIVERED',
    label: 'Collected',
    description: 'Confirm handover — COD collected / bank verification pending',
  },
];

export type RiderDeliveryAction = 'pickup' | 'arrived' | 'complete' | 'reject';

export function nextRiderAction(status: string): RiderDeliveryAction | null {
  if (status === 'RIDER_ASSIGNED' || status === 'READY_FOR_PICKUP') return 'pickup';
  if (status === 'PICKED_UP' || status === 'ON_THE_WAY') return 'arrived';
  if (status === 'ARRIVED') return 'complete';
  return null;
}

export function actionButtonLabel(action: RiderDeliveryAction): string {
  switch (action) {
    case 'pickup':
      return 'Rider picked order';
    case 'arrived':
      return 'Reached destination';
    case 'complete':
      return 'Mark collected';
    case 'reject':
      return 'Release order';
    default:
      return 'Update status';
  }
}

export function stepIndexForStatus(status: string): number {
  if (status === 'RIDER_ASSIGNED' || status === 'READY_FOR_PICKUP') return 0;
  if (CLAIMABLE_STATUSES.includes(status) || status === 'PENDING_PAYMENT_VERIFICATION') return 0;
  if (status === 'PICKED_UP' || status === 'ON_THE_WAY') return 1;
  if (status === 'ARRIVED') return 2;
  if (status === 'DELIVERED' || status === 'COMPLETED') return 3;
  return -1;
}

/** Map rider UI actions to API order statuses */
export function statusForRiderAction(action: RiderDeliveryAction): string | null {
  if (action === 'pickup') return 'PICKED_UP';
  if (action === 'arrived') return 'ARRIVED';
  if (action === 'complete') return 'DELIVERED';
  return null;
}
