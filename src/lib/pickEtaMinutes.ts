import { DEFAULT_ETA_MINUTES } from '@/constants/deliveryStatus';

/**
 * @deprecated Prefer `useEtaPicker().pickEta` so the themed ±5 modal is shown.
 * Kept as a safe fallback that resolves the default ETA.
 */
export function pickEtaMinutes(): Promise<number | null> {
  return Promise.resolve(DEFAULT_ETA_MINUTES);
}
