import { apiFetch } from '@/lib/apiFetch';

export type AppNotification = {
  _id: string;
  notificationType: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt?: string;
  sentAt?: string;
  redirectType?: string;
  redirectId?: string;
};

type NotificationsResponse = {
  data?: {
    notifications: AppNotification[];
    pagination?: { page: number; limit: number; total: number; totalPages: number };
  };
};

export async function fetchNotifications(page = 1, limit = 30) {
  const body = await apiFetch<NotificationsResponse>(`/notifications?page=${page}&limit=${limit}`);
  return body.data ?? { notifications: [], pagination: undefined };
}

export async function markNotificationRead(notificationId: string) {
  return apiFetch(`/notifications/read/${notificationId}`, { method: 'PATCH' });
}

export async function markAllNotificationsRead() {
  return apiFetch('/notifications/read-all', { method: 'PATCH' });
}

export async function registerDeviceToken(token: string, platform: 'android' | 'ios' | 'web') {
  return apiFetch('/notifications/device-token', {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
  });
}

export async function unregisterDeviceToken(token: string) {
  return apiFetch('/notifications/device-token', {
    method: 'DELETE',
    body: JSON.stringify({ token }),
  });
}
