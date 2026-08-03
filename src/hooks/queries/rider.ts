import { useQuery, type QueryClient } from '@tanstack/react-query';

import { usePerfQuery } from '@/lib/perf';
import {
  fetchAvailableOrders,
  fetchDeliveryHistory,
  fetchEarningsSummary,
  fetchOrderById,
  fetchPayoutHistory,
  fetchRiderEarnings,
  fetchRiderMe,
  fetchWithdrawalRequests,
} from '@/services/riders';

import { riderKeys } from './keys';

const FIVE_MIN = 5 * 60 * 1000;
const TEN_MIN = 10 * 60 * 1000;
/** Active trip order — socket is primary; poll is a safety net. */
const ACTIVE_ORDER_STALE = 10_000;
const ACTIVE_ORDER_POLL = 15_000;
const ACTIVE_ORDER_POLL_FAST = 8_000;

export function useRiderMeQuery(enabled = true) {
  const q = useQuery({
    queryKey: riderKeys.me,
    queryFn: fetchRiderMe,
    enabled,
    staleTime: 15_000,
    gcTime: TEN_MIN,
    // Always re-check on tab focus — clears stale currentOrderId after cancels.
    refetchOnMount: true,
    refetchOnReconnect: true,
  });
  usePerfQuery('RiderMe', q.isFetching, q.dataUpdatedAt);
  return q;
}

export function useRiderEarningsQuery(enabled = true) {
  const q = useQuery({
    queryKey: riderKeys.earnings,
    queryFn: fetchRiderEarnings,
    enabled,
    staleTime: FIVE_MIN,
    gcTime: TEN_MIN,
    refetchOnMount: false,
  });
  usePerfQuery('RiderEarnings', q.isFetching, q.dataUpdatedAt);
  return q;
}

export function useEarningsSummaryQuery(enabled = true) {
  const q = useQuery({
    queryKey: riderKeys.earningsSummary,
    queryFn: fetchEarningsSummary,
    enabled,
    staleTime: FIVE_MIN,
    gcTime: TEN_MIN,
    refetchOnMount: false,
  });
  usePerfQuery('EarningsSummary', q.isFetching, q.dataUpdatedAt);
  return q;
}

export function useDeliveryHistoryQuery(page: number, limit: number, enabled = true) {
  const q = useQuery({
    queryKey: riderKeys.history(page, limit),
    queryFn: () => fetchDeliveryHistory(page, limit),
    enabled,
    staleTime: FIVE_MIN,
    gcTime: TEN_MIN,
    refetchOnMount: false,
  });
  usePerfQuery(`DeliveryHistory(p${page})`, q.isFetching, q.dataUpdatedAt);
  return q;
}

/** Single polling source for available jobs — shared by Jobs tab + tab badges. */
export function useAvailableOrdersQuery(online: boolean, hasActiveOrder: boolean) {
  const shouldPoll = online && !hasActiveOrder;
  const q = useQuery({
    queryKey: riderKeys.availableOrders,
    queryFn: fetchAvailableOrders,
    enabled: online,
    staleTime: 8_000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: false,
    refetchInterval: shouldPoll ? 15_000 : false,
  });
  usePerfQuery('AvailableOrders', q.isFetching, q.dataUpdatedAt);
  return q;
}

/**
 * Single polling source for the active delivery — mount once in tabs layout.
 * All other screens read the shared cache via useRiderOrderCache / useRiderOrderQuery.
 */
export function useActiveOrderPolling(orderId: string | undefined, enabled: boolean) {
  const q = useQuery({
    queryKey: riderKeys.order(orderId ?? ''),
    queryFn: () => fetchOrderById(orderId!),
    enabled: Boolean(orderId) && enabled,
    staleTime: ACTIVE_ORDER_STALE,
    gcTime: TEN_MIN,
    refetchOnMount: true,
    refetchInterval: (query) => {
      if (!orderId || !enabled) return false;
      const pay = String(
        (query.state.data as { paymentStatus?: string } | undefined)?.paymentStatus ?? '',
      ).toUpperCase();
      // Faster while waiting on bank verification so Complete unlocks quickly if socket misses.
      if (pay === 'PENDING_VERIFICATION' || pay === 'PENDING') return ACTIVE_ORDER_POLL_FAST;
      return ACTIVE_ORDER_POLL;
    },
  });
  usePerfQuery(`OrderPoll(${orderId ?? 'none'})`, q.isFetching, q.dataUpdatedAt);
  return q;
}

/** Fetch once when opening order detail / map; no background poll (layout handles that). */
export function useRiderOrderQuery(orderId: string | undefined) {
  const q = useQuery({
    queryKey: riderKeys.order(orderId ?? ''),
    queryFn: () => fetchOrderById(orderId!),
    enabled: Boolean(orderId),
    staleTime: ACTIVE_ORDER_STALE,
    gcTime: TEN_MIN,
    refetchOnMount: false,
    refetchInterval: false,
  });
  usePerfQuery(`Order(${orderId ?? 'none'})`, q.isFetching, q.dataUpdatedAt);
  return q;
}

/** Cache-only subscriber for Home / Trip — no network unless manually refetched. */
export function useRiderOrderCache(orderId: string | undefined) {
  const q = useQuery({
    queryKey: riderKeys.order(orderId ?? ''),
    queryFn: () => fetchOrderById(orderId!),
    enabled: false,
    staleTime: ACTIVE_ORDER_STALE,
    gcTime: TEN_MIN,
  });
  usePerfQuery(`OrderCache(${orderId ?? 'none'})`, q.isFetching, q.dataUpdatedAt);
  return q;
}

export function usePayoutHistoryQuery(page: number, limit: number, enabled = true) {
  const q = useQuery({
    queryKey: riderKeys.payouts(page, limit),
    queryFn: () => fetchPayoutHistory(page, limit),
    enabled,
    staleTime: FIVE_MIN,
    gcTime: TEN_MIN,
    refetchOnMount: false,
  });
  usePerfQuery('PayoutHistory', q.isFetching, q.dataUpdatedAt);
  return q;
}

export function useWithdrawalRequestsQuery(page: number, limit: number, enabled = true) {
  const q = useQuery({
    queryKey: riderKeys.withdrawals(page, limit),
    queryFn: () => fetchWithdrawalRequests(page, limit),
    enabled,
    staleTime: FIVE_MIN,
    gcTime: TEN_MIN,
    refetchOnMount: false,
  });
  usePerfQuery('Withdrawals', q.isFetching, q.dataUpdatedAt);
  return q;
}

export function prefetchRiderOrder(qc: QueryClient, orderId: string) {
  if (!orderId) return;
  void qc.prefetchQuery({
    queryKey: riderKeys.order(orderId),
    queryFn: () => fetchOrderById(orderId),
    staleTime: ACTIVE_ORDER_STALE,
  });
}
