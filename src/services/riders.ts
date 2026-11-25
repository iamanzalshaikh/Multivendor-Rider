import { apiUploadForm } from '@/lib/apiUpload';
import { apiFetch } from '@/lib/apiFetch';
import { logFormDataParts, toUploadFile } from '@/lib/multipart';
import type {
  ApiEnvelope,
  RiderChatMessage,
  RiderEarnings,
  RiderOrder,
  RiderProfile,
  RiderUser,
  VehicleType,
} from '@/types/rider';

/**
 * @deprecated Riders earn the order's delivery fee + tip, not a flat rate.
 * Use riderEarningForOrder() from '@/lib/money'. Kept only as a display fallback
 * when an order payload has no fee attached yet.
 */
const RIDER_FEE = 0;

export { RIDER_FEE };

export async function registerRider(input: {
  fullName: string;
  email: string;
  password: string;
  mobile?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  drivingLicenseUri?: string;
  aadhaarCardUri?: string;
  profileImageUri?: string;
  bankAccountDetails?: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode?: string;
  };
}) {
  if (input.drivingLicenseUri && input.aadhaarCardUri) {
    const formData = new FormData();
    formData.append('fullName', input.fullName);
    formData.append('email', input.email);
    formData.append('password', input.password);
    if (input.mobile) formData.append('mobile', input.mobile);
    if (input.vehicleType) formData.append('vehicleType', input.vehicleType);
    if (input.vehicleNumber) formData.append('vehicleNumber', input.vehicleNumber);
    if (input.bankAccountDetails) {
      formData.append('bankAccountDetails', JSON.stringify(input.bankAccountDetails));
    }

    if (input.profileImageUri) {
      formData.append('profileImage', toUploadFile(input.profileImageUri, 'profile.jpg') as unknown as Blob);
    }
    formData.append(
      'drivingLicense',
      toUploadFile(input.drivingLicenseUri, 'driving-license.jpg') as unknown as Blob,
    );
    formData.append(
      'aadhaarCard',
      toUploadFile(input.aadhaarCardUri, 'aadhaar-card.jpg') as unknown as Blob,
    );

    logFormDataParts(formData, 'riders/register');
    if (__DEV__) console.log('[registerRider] submitting multipart KYC registration');

    return apiUploadForm<ApiEnvelope<{ user: RiderUser; rider: RiderProfile }>>(
      '/riders/register',
      formData,
    );
  }

  return apiFetch<ApiEnvelope<{ user: RiderUser; rider: RiderProfile }>>('/riders/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function loginRider(input: { email: string; password: string }) {
  return apiFetch<
    ApiEnvelope<{
      user: RiderUser;
      rider: RiderProfile;
      accessToken: string;
      refreshToken: string;
    }>
  >('/riders/login', { method: 'POST', body: JSON.stringify(input) });
}

export async function fetchRiderMe() {
  const body = await apiFetch<ApiEnvelope<{ rider: RiderProfile; user: RiderUser }>>('/riders/me');
  return body.data!;
}

export async function fetchRiderProfile() {
  const data = await fetchRiderMe();
  return data.rider;
}

export async function updateRiderProfile(input: {
  fullName?: string;
  mobile?: string;
  vehicleType?: VehicleType;
  vehicleNumber?: string;
  drivingLicense?: string;
  aadhaarCard?: string;
  profileImage?: string;
  bankAccountDetails?: {
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
  };
}) {
  const body = await apiFetch<ApiEnvelope<{ rider: RiderProfile; user: RiderUser }>>('/riders/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return body.data!;
}

export async function updateRiderOnlineStatus(onlineStatus: boolean) {
  const body = await apiFetch<ApiEnvelope<{ rider: RiderProfile }>>('/riders/status', {
    method: 'PATCH',
    body: JSON.stringify({ onlineStatus }),
  });
  return body.data!.rider;
}

export async function updateRiderLocation(input: {
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
}) {
  return apiFetch('/riders/location', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

function asRiderOrder(data: unknown, fallbackId?: string): RiderOrder {
  if (data && typeof data === 'object') {
    const o = data as RiderOrder & { id?: string };
    if (!o._id && o.id) return { ...o, _id: o.id };
    if (o._id) return o;
  }
  return { _id: fallbackId ?? '' } as RiderOrder;
}

export async function fetchAvailableOrders() {
  const body = await apiFetch<ApiEnvelope<RiderOrder[] | { orders: RiderOrder[] }>>(
    '/riders/case/available-orders',
  );
  const raw = body.data;
  if (Array.isArray(raw)) return raw.map((o) => asRiderOrder(o));
  return (raw?.orders ?? []).map((o) => asRiderOrder(o));
}

export async function acceptOrder(orderId: string) {
  const body = await apiFetch<ApiEnvelope<RiderOrder>>(`/riders/case/orders/${orderId}/accept`, {
    method: 'PATCH',
  });
  return asRiderOrder(body.data, orderId);
}

/** Hand an accepted order back to the pool. Allowed only before pickup. */
export async function rejectOrder(orderId: string, reason?: string) {
  const body = await apiFetch<ApiEnvelope<RiderOrder>>(
    `/riders/case/orders/${orderId}/release`,
    {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    },
  );
  return asRiderOrder(body.data, orderId);
}

/**
 * Confirm items bought/collected at the store.
 * Sends PICKED_UP for API compatibility; newer backends normalize it to PROCESSING
 * (cancel lock). UI still labels this step "Items purchased".
 */
export async function markItemsPurchased(orderId: string) {
  const body = await apiFetch<ApiEnvelope<RiderOrder>>(`/riders/case/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'PICKED_UP' }),
  });
  return asRiderOrder(body.data, orderId);
}

/** @deprecated use markItemsPurchased */
export async function pickupOrder(orderId: string) {
  return markItemsPurchased(orderId);
}

/** Rider departs store → ON_THE_WAY with arrival ETA (default 15 mins). */
export async function startOnTheWay(orderId: string, etaMinutes = 15) {
  const body = await apiFetch<ApiEnvelope<RiderOrder>>(`/riders/case/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'ON_THE_WAY', etaMinutes }),
  });
  return asRiderOrder(body.data, orderId);
}

export async function markArrived(orderId: string) {
  const body = await apiFetch<ApiEnvelope<RiderOrder>>(`/riders/case/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'ARRIVED' }),
  });
  return asRiderOrder(body.data, orderId);
}

export type BatchStatusResult = {
  updated?: RiderOrder[];
  updatedCount?: number;
  skipped?: Array<{ orderId: string; orderNumber?: string; reason: string }>;
  failed?: Array<{ orderId: string; orderNumber?: string; reason: string }>;
};

export async function batchUpdateCaseOrderStatuses(input: {
  status: string;
  etaMinutes?: number;
  orderIds?: string[];
}): Promise<BatchStatusResult> {
  const { status, etaMinutes, orderIds } = input;
  try {
    const body = await apiFetch<ApiEnvelope<BatchStatusResult | RiderOrder[]>>(
      `/riders/case/orders/batch-status`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          ...(etaMinutes != null ? { etaMinutes } : {}),
          ...(orderIds?.length ? { orderIds } : {}),
        }),
      },
    );
    const data = body.data;
    if (Array.isArray(data)) return { updated: data, updatedCount: data.length };
    return data ?? { updated: [], updatedCount: 0 };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (status === 'PROCESSING' && msg.includes('PICKED_UP')) {
      const body = await apiFetch<ApiEnvelope<BatchStatusResult | RiderOrder[]>>(
        `/riders/case/orders/batch-status`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status: 'PICKED_UP',
            ...(etaMinutes != null ? { etaMinutes } : {}),
            ...(orderIds?.length ? { orderIds } : {}),
          }),
        },
      );
      const data = body.data;
      if (Array.isArray(data)) return { updated: data, updatedCount: data.length };
      return data ?? { updated: [], updatedCount: 0 };
    }
    throw err;
  }
}

/** @deprecated use startOnTheWay / markArrived */
export async function startDelivery(orderId: string) {
  return markArrived(orderId);
}

/** Tell the customer selected item(s) ran out of stock (pre-purchase only). */
export async function reportItemsOutOfStock(
  orderId: string,
  itemIds: string[],
  reason?: string,
) {
  const body = await apiFetch<ApiEnvelope<RiderOrder>>(
    `/riders/case/orders/${orderId}/unavailable`,
    {
      method: 'POST',
      body: JSON.stringify({
        itemIds,
        ...(reason ? { reason } : {}),
      }),
    },
  );
  return asRiderOrder(body.data, orderId);
}

export async function completeDelivery(orderId: string) {
  const body = await apiFetch<ApiEnvelope<{ orderId?: string; commission?: number } & RiderOrder>>(
    `/riders/case/orders/${orderId}/complete`,
    { method: 'PATCH', body: JSON.stringify({}) },
  );
  const data = body.data;
  if (data && typeof data === 'object' && 'orderId' in data && !('_id' in data && (data as RiderOrder)._id)) {
    const earned = Number((data as { commission?: number }).commission ?? 0);
    return {
      _id: String((data as { orderId?: string }).orderId ?? orderId),
      orderStatus: 'COMPLETED',
      grandTotal: 0,
      earnedAmount: earned,
    } satisfies RiderOrder;
  }
  return asRiderOrder(data, orderId);
}

export type CashPaymentSessionPayload = {
  orderId: string;
  amountReceived: number;
  changeReturned?: number;
  /** Get Anything — rider-set delivery fee (JMD). */
  deliveryFee?: number;
  offlineId?: string;
  idempotencyKey?: string;
};

export async function createCashPaymentSession(input: CashPaymentSessionPayload) {
  const body = await apiFetch('/case/cash-sessions', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return (body as ApiEnvelope<unknown>).data;
}

/** Resume an already-sent cash confirmation for this order (rider reopened screen). */
export async function fetchCashSessionByOrder(orderId: string) {
  const body = await apiFetch(`/case/cash-sessions/by-order/${orderId}`);
  return (body as ApiEnvelope<unknown>).data ?? null;
}

/** Re-send push + in-app + socket prompt for a pending cash session. */
export async function remindCashPaymentSession(sessionId: string) {
  const body = await apiFetch(`/case/cash-sessions/${sessionId}/remind`, {
    method: 'POST',
  });
  return (body as ApiEnvelope<{ notified?: boolean; id?: string }>).data;
}

export async function createTopUpSession(input: {
  customerId: string;
  amountReceived: number;
  offlineId?: string;
}) {
  const body = await apiFetch('/case/cash-sessions/top-up', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return (body as ApiEnvelope<unknown>).data;
}

export async function fetchRiderEarnings() {
  const body = await apiFetch<ApiEnvelope<{ earnings: RiderEarnings }>>('/riders/earnings');
  return body.data!.earnings;
}

export type RiderEarningsSummary = {
  deliveryCount: number;
  /** Delivered, but the payment is still awaiting verification */
  awaitingVerification: { deliveryCount: number; grossEarnings: number };
  cash: { deliveryCount: number; grossEarnings: number; cashToRemit: number };
  online: { deliveryCount: number; grossEarnings: number };
  breakdown: { deliveryFees: number; tips: number };
};

export async function fetchEarningsSummary() {
  const body = await apiFetch<ApiEnvelope<RiderEarningsSummary>>('/riders/earnings/summary');
  return body.data!;
}


export async function fetchPastShifts() {
  const body = await apiFetch<ApiEnvelope<any[]>>('/riders/case/shifts/history');
  return body.data || [];
}

export async function fetchDeliveryHistory(page = 1, limit = 20) {
  const body = await apiFetch<ApiEnvelope<{ orders: RiderOrder[]; pagination?: { total: number } }>>(
    `/riders/history?page=${page}&limit=${limit}`,
  );
  return body.data ?? { orders: [] };
}

export async function fetchOrderById(orderId: string) {
  const body = await apiFetch<ApiEnvelope<{ order: RiderOrder }>>(`/orders/${orderId}`);
  return asRiderOrder(body.data?.order, orderId);
}

export async function fetchOrderRoute(orderId: string) {
  const body = await apiFetch<ApiEnvelope<{ path: { latitude: number; longitude: number }[] }>>(
    `/orders/track/${orderId}/route`,
  );
  return body.data?.path ?? [];
}

export async function fetchOrderChat(orderId: string): Promise<{
  messages: RiderChatMessage[];
  unreadCount: number;
}> {
  const body = await apiFetch<
    ApiEnvelope<
      RiderChatMessage[] | { messages?: RiderChatMessage[]; unreadCount?: number }
    >
  >(`/case/orders/${orderId}/chat`);
  const data = body.data;
  const list = Array.isArray(data) ? data : data?.messages ?? [];
  const messages = list.map((m) => ({
    ...m,
    id: m.id ?? m._id ?? '',
  }));
  const unreadCount = Array.isArray(data) ? 0 : Number(data?.unreadCount ?? 0);
  return { messages, unreadCount };
}

export async function sendOrderChat(orderId: string, message: string): Promise<RiderChatMessage> {
  const body = await apiFetch<ApiEnvelope<RiderChatMessage>>(`/case/orders/${orderId}/chat`, {
    method: 'POST',
    body: JSON.stringify({ body: message }),
  });
  const msg = body.data!;
  return { ...msg, id: msg.id ?? msg._id ?? '' };
}

export type ShiftPurchaseCategory = 'FUEL' | 'PARKING' | 'FOOD_EXTRA' | 'SUPPLIES' | 'OTHER';

export type RiderShiftPurchase = {
  id: string;
  category: ShiftPurchaseCategory | string;
  amount: number;
  note?: string | null;
  receiptUrl?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
  rejectReason?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
};

export type RiderShiftSummary = {
  id: string;
  floatIssued: number;
  cashCollected: number;
  cashSpentPurchases: number;
  deliveryFeesCollected: number;
  tipsReceived: number;
  commissionEarned: number;
  riderKeep: number;
  expectedCashReturn: number;
  walletAdjustments?: number;
  overpaymentsHeld?: number;
  underpaymentsShort?: number;
  walletCreditsApplied?: number;
  deliveriesCompleted: number;
  startedAt: string;
  endedAt?: string | null;
  purchases?: RiderShiftPurchase[];
};

export async function fetchCaseShiftPurchases() {
  const body = await apiFetch<
    ApiEnvelope<{ shift: RiderShiftSummary | null; purchases: RiderShiftPurchase[] }>
  >('/riders/case/purchases');
  return body.data ?? { shift: null, purchases: [] };
}

export async function startCaseShift(floatIssued = 0) {
  const body = await apiFetch<ApiEnvelope<RiderShiftSummary>>('/riders/case/shift/start', {
    method: 'POST',
    body: JSON.stringify({ floatIssued }),
  });
  return body.data!;
}

export async function endCaseShift(actualCashReturned?: number) {
  const body = await apiFetch<ApiEnvelope<RiderShiftSummary>>('/riders/case/shift/end', {
    method: 'POST',
    body: JSON.stringify({ actualCashReturned }),
  });
  return body.data!;
}

export async function fetchCaseEarningsDashboard() {
  const body = await apiFetch<
    ApiEnvelope<{
      rider: { id: string; riderCode: string; riderType: string; availability: string };
      activeOrders: number;
      shift: RiderShiftSummary | null;
    }>
  >('/riders/case/earnings');
  return body.data!;
}

export async function logShiftPurchase(input: {
  amount: number;
  category?: ShiftPurchaseCategory;
  note?: string;
}) {
  const body = await apiFetch<ApiEnvelope<RiderShiftPurchase>>('/riders/case/purchases', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return body.data!;
}

export type RiderReviewItem = {
  id?: string;
  _id?: string;
  rating?: number;
  riderRating?: number;
  comment?: string | null;
  reviewText?: string | null;
  customerName?: string;
  orderNumber?: string;
  createdAt?: string;
};

export async function fetchMyRiderReviews() {
  const body = await apiFetch<
    ApiEnvelope<{
      items: RiderReviewItem[];
      total: number;
      page: number;
      totalPages: number;
      averageRating?: number;
      ratingDistribution?: Record<1 | 2 | 3 | 4 | 5, number>;
    }>
  >('/riders/me/reviews');
  return body.data!;
}
