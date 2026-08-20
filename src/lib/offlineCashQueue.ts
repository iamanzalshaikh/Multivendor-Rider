import AsyncStorage from '@react-native-async-storage/async-storage';
import { createCashPaymentSession, type CashPaymentSessionPayload } from '@/services/riders';

const QUEUE_KEY = '@rider_pending_cash_sessions';

export type PendingCashSession = CashPaymentSessionPayload & {
  localId: string;
  createdAt: string;
};

export async function loadPendingCashSessions(): Promise<PendingCashSession[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PendingCashSession[];
  } catch {
    return [];
  }
}

async function savePendingCashSessions(items: PendingCashSession[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function enqueueOfflineCashSession(
  payload: CashPaymentSessionPayload,
): Promise<PendingCashSession> {
  const localId = payload.offlineId ?? `offline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const entry: PendingCashSession = {
    ...payload,
    offlineId: localId,
    idempotencyKey: localId,
    localId,
    createdAt: new Date().toISOString(),
  };
  const items = await loadPendingCashSessions();
  items.push(entry);
  await savePendingCashSessions(items);
  return entry;
}

export async function removePendingCashSession(localId: string) {
  const items = await loadPendingCashSessions();
  await savePendingCashSessions(items.filter((i) => i.localId !== localId));
}

export async function syncPendingCashSessions(): Promise<{ synced: number; failed: number }> {
  const items = await loadPendingCashSessions();
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      await createCashPaymentSession({
        orderId: item.orderId,
        amountReceived: item.amountReceived,
        changeReturned: item.changeReturned,
        offlineId: item.localId,
        idempotencyKey: item.localId,
      });
      await removePendingCashSession(item.localId);
      synced += 1;
    } catch {
      failed += 1;
    }
  }

  return { synced, failed };
}

export async function countPendingCashSessions(): Promise<number> {
  const items = await loadPendingCashSessions();
  return items.length;
}
