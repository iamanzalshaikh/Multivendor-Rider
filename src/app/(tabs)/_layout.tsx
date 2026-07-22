import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DeliveryOfferModal } from '@/components/DeliveryOfferModal';
import { Fonts } from '@/constants/theme';
import { useActiveOrderPolling } from '@/hooks/queries/rider';
import { useRiderProfile } from '@/hooks/use-rider-profile';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useTabBadges } from '@/hooks/use-tab-badges';
import { useRiderLocationTracking } from '@/hooks/use-rider-location';
import { useRiderSocket } from '@/hooks/use-rider-socket';
import { useTheme } from '@/hooks/use-theme';
import { useRiderStore } from '@/stores/riderStore';

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { onlineStatus, currentOrderId } = useRiderProfile();
  const rider = useRiderStore((s) => s.rider);
  const online = onlineStatus;
  const hasActive = Boolean(currentOrderId ?? rider?.currentOrderId);
  const activeOrderId = currentOrderId ?? rider?.currentOrderId;
  const { jobCount, hasActiveTrip } = useTabBadges();

  useActiveOrderPolling(activeOrderId, online && hasActive);
  useRiderLocationTracking(online && hasActive);
  useRiderSocket(online);
  usePushNotifications(true);

  const androidBottomInset = Math.max(insets.bottom, 8);
  const tabBarHeight = Platform.OS === 'ios' ? 50 + insets.bottom : 62 + androidBottomInset;

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarStyle: {
            backgroundColor: theme.backgroundElement,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            elevation: 16,
            height: tabBarHeight,
            paddingBottom: Platform.OS === 'ios' ? insets.bottom : androidBottomInset,
            paddingTop: 8,
          },
          tabBarItemStyle: {
            paddingVertical: 2,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontFamily: Fonts.semiBold,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="jobs"
          options={{
            title: 'Jobs',
            tabBarBadge: jobCount > 0 ? jobCount : undefined,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'briefcase' : 'briefcase-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'Trip',
            tabBarBadge: hasActiveTrip ? 1 : undefined,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'navigate' : 'navigate-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="earnings"
          options={{
            title: 'Earnings',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'wallet' : 'wallet-outline'} size={22} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
            ),
          }}
        />
      </Tabs>
      <DeliveryOfferModal />
    </>
  );
}
