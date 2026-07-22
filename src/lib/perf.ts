import { useEffect, useRef } from 'react';

/**
 * Logs query cache/network status once per fetch cycle (not every re-render).
 */
export function usePerfQuery(name: string, isFetching: boolean, dataUpdatedAt: number): void {
  const lastKey = useRef('');

  useEffect(() => {
    if (!__DEV__) return;
    const key = `${isFetching}:${dataUpdatedAt}`;
    if (key === lastKey.current) return;
    lastKey.current = key;

    const ageMs = Date.now() - dataUpdatedAt;
    const source = isFetching ? '🌐 NETWORK' : `💾 CACHE (${Math.round(ageMs / 1000)}s old)`;
    console.log(`📊 [RIDER QUERY] ${name} → ${source}`);
  }, [name, isFetching, dataUpdatedAt]);
}
