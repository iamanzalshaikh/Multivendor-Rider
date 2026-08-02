import { useQuery } from '@tanstack/react-query';

import { notificationKeys } from '@/hooks/queries/keys';
import { fetchNotifications } from '@/services/notifications';

export function useUnreadNotificationCount(enabled = true) {
  const q = useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: async () => {
      const { notifications } = await fetchNotifications(1, 50);
      return notifications.filter((n) => !n.isRead).length;
    },
    enabled,
    refetchInterval: 90_000,
    staleTime: 60_000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

  return q.data ?? 0;
}
