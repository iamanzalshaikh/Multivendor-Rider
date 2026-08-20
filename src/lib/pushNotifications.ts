import * as Notifications from 'expo-notifications';
import { Platform, Vibration } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { isAndroidEmulator } from '@/lib/device';
import { registerDeviceToken, unregisterDeviceToken } from '@/services/notifications';
import { queryClient } from '@/lib/queryClient';
import { invalidateAvailableOrders } from '@/lib/riderQueryInvalidation';
import { useDeliveryOfferStore } from '@/stores/deliveryOfferStore';
import { useRiderStore } from '@/stores/riderStore';

const PUSH_TOKEN_TIMEOUT_MS = 8000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Push token timeout')), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

const PUSH_TOKEN_KEY = 'expo.pushToken';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    // Android emulators cannot obtain FCM tokens — skip to avoid blocking startup.
    if (Platform.OS === 'android' && isAndroidEmulator()) {
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;

    if (!projectId) {
      console.warn('[Push] No EAS projectId in app.json extra.eas.projectId');
      return null;
    }

    const tokenData = await withTimeout(
      Notifications.getExpoPushTokenAsync({ projectId }),
      PUSH_TOKEN_TIMEOUT_MS,
    );
    const token = tokenData.data;

    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    await registerDeviceToken(token, Platform.OS === 'ios' ? 'ios' : 'android');

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 200, 200, 200],
        lightColor: '#ff5a00',
      });

      await Notifications.setNotificationChannelAsync('delivery', {
        name: 'Delivery jobs',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 400, 200, 400],
        lightColor: '#ff5a00',
        enableVibrate: true,
      });
    }

    return token;
  } catch (error) {
    console.warn('[Push] Registration failed:', error);
    return null;
  }
}

export async function unregisterForPushNotifications(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (token) {
      await unregisterDeviceToken(token);
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    }
  } catch (error) {
    console.warn('[Push] Unregister failed:', error);
  }
}

export function setupNotificationListeners() {
  const foregroundSubscription = Notifications.addNotificationReceivedListener((notification) => {
    void queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });

    const data = notification.request.content.data as Record<string, unknown>;
    if (data?.type !== 'delivery_available' || !data.orderId) return;

    const rider = useRiderStore.getState().rider;
    if (rider?.currentOrderId) return;

    useDeliveryOfferStore.getState().showOffer({
      orderId: String(data.orderId),
      orderNumber: String(data.orderNumber ?? ''),
      restaurantName: String(data.restaurantName ?? 'Restaurant'),
      grandTotal: Number(data.grandTotal ?? 0),
      riderEarning: Number(data.riderEarning ?? 0),
    });
    invalidateAvailableOrders(queryClient);
    Vibration.vibrate([0, 350, 120, 350]);
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
    handleNotificationTap(response.notification.request.content.data as Record<string, unknown>);
  });

  return { foregroundSubscription, responseSubscription };
}

export function handleNotificationTap(data: Record<string, unknown>) {
  const type = data?.type;
  if (type === 'delivery_available' && data.orderId) {
    router.push(`/order/${data.orderId}` as never);
    return;
  }
  if (data.redirectType === 'ORDER' && data.redirectId) {
    router.push(`/order/${data.redirectId}` as never);
    return;
  }
  router.push('/notifications' as never);
}

/** Foreground alert when a socket delivery offer arrives */
export async function alertNewDeliveryOffer(input: {
  orderId?: string;
  orderNumber: string;
  restaurantName: string;
  grandTotal?: number;
}) {
  Vibration.vibrate([0, 350, 120, 350]);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'New delivery',
      body: `#${input.orderNumber} · ${input.restaurantName}`,
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: {
        type: 'delivery_available',
        orderId: input.orderId,
        orderNumber: input.orderNumber,
        restaurantName: input.restaurantName,
        grandTotal: input.grandTotal != null ? String(input.grandTotal) : undefined,
      },
      ...(Platform.OS === 'android'
        ? { channelId: 'delivery' }
        : { sound: true }),
    },
    trigger: null,
  });
}
