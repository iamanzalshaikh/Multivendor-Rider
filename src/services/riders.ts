import { apiUploadForm } from '@/lib/apiUpload';
import { apiFetch } from '@/lib/apiFetch';
import { logFormDataParts, toUploadFile } from '@/lib/multipart';
import type { ApiEnvelope, RiderEarnings, RiderOrder, RiderProfile, RiderUser, VehicleType } from '@/types/rider';

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
    ifscCode: string;
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

export async function pickupOrder(orderId: string) {
  const body = await apiFetch<ApiEnvelope<RiderOrder>>(`/riders/case/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'PICKED_UP' }),
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

/** @deprecated use markArrived — kept for older call sites */
export async function startDelivery(orderId: string) {
  return markArrived(orderId);
}

export async function completeDelivery(orderId: string) {
  const body = await apiFetch<ApiEnvelope<{ orderId?: string; commission?: number } & RiderOrder>>(
    `/riders/case/orders/${orderId}/complete`,
    { method: 'PATCH', body: JSON.stringify({}) },
  );
  const data = body.data;
  // Backend returns { orderId, commission } — normalize to a completed RiderOrder stub
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

export async function fetchRiderEarnings() {
  const body = await apiFetch<ApiEnvelope<{ earnings: RiderEarnings }>>('/riders/earnings');
  return body.data!.earnings;
}

export type RiderEarningsSummary = {
  deliveryCount: number;
  pendingPayout: { deliveryCount: number; grossEarnings: number };
  totalPaidOut: { deliveryCount: number; grossEarnings: number };
  totalEarnings: number;
  todayEarnings: number;
  earningPerDelivery: number;
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

export async function fetchPayoutHistory(page = 1, limit = 20) {
  const body = await apiFetch<
    ApiEnvelope<{
      payouts: {
        _id: string;
        netPayable: number;
        amount?: number;
        status: string;
        periodStart?: string;
        periodEnd?: string;
        paidAt?: string;
      }[];
      pagination?: { total: number };
    }>
  >(`/riders/payouts?page=${page}&limit=${limit}`);
  return body.data ?? { payouts: [] };
}

export async function fetchWithdrawalRequests(page = 1, limit = 20) {
  const body = await apiFetch<
    ApiEnvelope<{
      requests: {
        _id: string;
        requestNumber: string;
        amount: number;
        status: string;
        createdAt: string;
      }[];
      availableBalance: number;
      pagination?: { total: number };
    }>
  >(`/riders/withdrawals?page=${page}&limit=${limit}`);
  return body.data ?? { requests: [], availableBalance: 0 };
}

export async function requestWithdrawal(amount: number) {
  const body = await apiFetch<
    ApiEnvelope<{ request: { _id: string; requestNumber: string; amount: number; status: string } }>
  >('/riders/withdrawals', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
  return body.data!.request;
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
