import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Brand } from '@/constants/theme';
import { refreshAccessToken } from '@/lib/tokenRefresh';
import { getAccessToken, getRefreshToken } from '@/lib/storage';
import { fetchRiderProfile } from '@/services/riders';
import { useRiderStore } from '@/stores/riderStore';

const BOOT_TIMEOUT_MS = 2500;

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
  const [target, setTarget] = useState<'auth' | 'tabs' | null>(null);

  useEffect(() => {
    let alive = true;

    const fallback = setTimeout(() => {
      if (alive) setTarget('auth');
    }, BOOT_TIMEOUT_MS);

    (async () => {
      try {
        let token = await withTimeout(getAccessToken(), BOOT_TIMEOUT_MS);
        if (!token) {
          const refresh = await withTimeout(getRefreshToken(), 1500);
          if (refresh) token = await withTimeout(refreshAccessToken(), BOOT_TIMEOUT_MS);
        }
        if (!alive) return;
        clearTimeout(fallback);

        if (token) {
          // Enter tabs immediately — profile warms in the background.
          setTarget('tabs');
          warmProfile();
          return;
        }
        setTarget('auth');
      } catch {
        if (!alive) return;
        clearTimeout(fallback);
        setTarget('auth');
      }
    })();

    return () => {
      alive = false;
      clearTimeout(fallback);
    };
  }, []);

  if (!target) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Brand.orange }}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return <Redirect href={target === 'tabs' ? '/(tabs)' : '/(auth)'} />;
}
