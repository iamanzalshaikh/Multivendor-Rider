export const riderKeys = {
  all: ['rider'] as const,
  me: ['rider', 'me'] as const,
  profile: ['rider', 'profile'] as const,
  earnings: ['rider', 'earnings'] as const,
  earningsSummary: ['rider', 'earnings-summary'] as const,
  history: (page: number, limit: number) => ['rider', 'history', page, limit] as const,
  availableOrders: ['rider', 'available-orders'] as const,
  order: (orderId: string) => ['rider', 'order', orderId] as const,
  payouts: (page: number, limit: number) => ['rider', 'payouts', page, limit] as const,
  withdrawals: (page: number, limit: number) => ['rider', 'withdrawals', page, limit] as const,
  shiftPurchases: ['rider', 'shift-purchases'] as const,
};

export const notificationKeys = {
  unreadCount: ['notifications', 'unread-count'] as const,
  list: (page: number) => ['notifications', 'list', page] as const,
};
