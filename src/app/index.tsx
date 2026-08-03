import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import SplashScreen, { SPLASH_MIN_MS } from './splash';
import { refreshAccessToken } from '@/lib/tokenRefresh';
import { getAccessToken, getRefreshToken } from '@/lib/storage';
import { fetchRiderProfile } from '@/services/riders';
import { useRiderStore } from '@/stores/riderStore';

const BOOT_TIMEOUT_MS = 2500;
/** Keep splash painted while the destination screen mounts (avoids white flash). */
const HANDOFF_MS = 120;

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Bootstrap timeout')), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function warmProfile() {
  void fetchRiderProfile()
    .then((profile) => useRiderStore.getState().setRider(profile))
    .catch(() => {
      // Tabs layout refetches profile
    });
}

export default function Index() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      const startedAt = Date.now();
      let next: '/(tabs)' | '/(auth)' = '/(auth)';

      try {
        let token = await withTimeout(getAccessToken(), BOOT_TIMEOUT_MS);
        if (!token) {
          const refresh = await withTimeout(getRefreshToken(), 1500);
          if (refresh) token = await withTimeout(refreshAccessToken(), BOOT_TIMEOUT_MS);
        }
        if (!alive) return;

        if (token) {
          next = '/(tabs)';
          warmProfile();
        } else {
          next = '/(auth)';
        }
      } catch {
        next = '/(auth)';
      }

      if (!alive) return;

      const remaining = SPLASH_MIN_MS - (Date.now() - startedAt);
      if (remaining > 0) await wait(remaining);
      if (!alive) return;

      // Navigate first while splash still covers the screen.
      router.replace(next);
      await wait(HANDOFF_MS);
      if (alive) setShowSplash(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  if (!showSplash) return <View style={styles.transparent} />;

  return <SplashScreen />;
}

const styles = StyleSheet.create({
  transparent: { flex: 1 },
});
