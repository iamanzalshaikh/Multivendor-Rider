import { useCallback, useRef, useState } from 'react';

import { EtaPickerModal } from '@/components/EtaPickerModal';
import { DEFAULT_ETA_MINUTES } from '@/constants/deliveryStatus';

/**
 * Themed ETA picker (±5 mins). Render `etaPickerModal` in the tree, then
 * `await pickEta()` from swipe / button handlers.
 */
export function useEtaPicker() {
  const [visible, setVisible] = useState(false);
  const [initial, setInitial] = useState(DEFAULT_ETA_MINUTES);
  const resolveRef = useRef<((v: number | null) => void) | null>(null);

  const pickEta = useCallback((initialMinutes = DEFAULT_ETA_MINUTES) => {
    setInitial(initialMinutes);
    setVisible(true);
    return new Promise<number | null>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const finish = useCallback((value: number | null) => {
    setVisible(false);
    resolveRef.current?.(value);
    resolveRef.current = null;
  }, []);

  const etaPickerModal = (
    <EtaPickerModal
      visible={visible}
      initialMinutes={initial}
      onConfirm={(m) => finish(m)}
      onCancel={() => finish(null)}
    />
  );

  return { pickEta, etaPickerModal };
}
