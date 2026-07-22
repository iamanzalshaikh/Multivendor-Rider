import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { alertNewDeliveryOffer } from '@/lib/pushNotifications';
import {
  invalidateAfterSocketOrderEvent,
  invalidateAvailableOrders,
} from '@/lib/riderQueryInvalidation';
import { connectSocket, getSocketInstance } from '@/lib/socketClient';
import { emitRiderOnlineStatus } from '@/lib/riderSocketActions';
import { ServerSocketEvents, type OrderSocketPayload } from '@/lib/socketEvents';
import { useDeliveryOfferStore } from '@/stores/deliveryOfferStore';
import { useRiderStore } from '@/stores/riderStore';

type DeliveryAvailablePayload = OrderSocketPayload;

type DeliveryClaimedPayload = {
  orderId?: string;
};

const REFRESH_EVENTS = [
  ServerSocketEvents.ORDER_UPDATED,
  ServerSocketEvents.RIDER_ASSIGNED,
  ServerSocketEvents.ORDER_PICKED_UP,
  ServerSocketEvents.ORDER_DELIVERED,
  ServerSocketEvents.ORDER_CANCELLED,
  ServerSocketEvents.DELIVERY_CLAIMED,
] as const;

export function useRiderSocket(enabled: boolean) {
  const qc = useQueryClient();
  const showOffer = useDeliveryOfferStore((s) => s.showOffer);
  const clearOffer = useDeliveryOfferStore((s) => s.clearOffer);

  useEffect(() => {
    if (!enabled) {
      void emitRiderOnlineStatus(false);
      return;
    }

    let alive = true;

    const onDeliveryAvailable = (payload: DeliveryAvailablePayload) => {
      const rider = useRiderStore.getState().rider;
      if (rider?.currentOrderId) return;
      if (!payload.orderId || !payload.orderNumber) return;

      showOffer({
        orderId: payload.orderId,
        orderNumber: payload.orderNumber,
        restaurantName: payload.restaurantName ?? 'Restaurant',
        grandTotal: payload.grandTotal ?? 0,
        acceptTimeoutSeconds: payload.acceptTimeoutSeconds,
      });
      void alertNewDeliveryOffer({
        orderNumber: payload.orderNumber,
        restaurantName: payload.restaurantName ?? 'Restaurant',
      });
      void qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      invalidateAvailableOrders(qc);
    };

    const onDeliveryClaimed = (payload: DeliveryClaimedPayload) => {
      if (payload.orderId) clearOffer(payload.orderId);
      invalidateAfterSocketOrderEvent(
        qc,
        ServerSocketEvents.DELIVERY_CLAIMED,
        payload.orderId,
      );
    };

    const refreshHandlers = REFRESH_EVENTS.map((event) => {
      const handler = (payload: OrderSocketPayload = {}) => {
        invalidateAfterSocketOrderEvent(qc, event, payload.orderId);
      };
      return { event, handler };
    });

    (async () => {
      try {
        const s = await connectSocket();
        if (!alive) return;

        await emitRiderOnlineStatus(true);

        s.on(ServerSocketEvents.DELIVERY_AVAILABLE, onDeliveryAvailable);
        s.on(ServerSocketEvents.DELIVERY_CLAIMED, onDeliveryClaimed);
        refreshHandlers.forEach(({ event, handler }) => s.on(event, handler));
      } catch {
        // layout polls active order as fallback when socket is down
      }
    })();

    return () => {
      alive = false;
      void emitRiderOnlineStatus(false);
      const sock = getSocketInstance();
      if (sock) {
        sock.off(ServerSocketEvents.DELIVERY_AVAILABLE, onDeliveryAvailable);
        sock.off(ServerSocketEvents.DELIVERY_CLAIMED, onDeliveryClaimed);
        refreshHandlers.forEach(({ event, handler }) => sock.off(event, handler));
      }
    };
  }, [enabled, qc, showOffer, clearOffer]);
}
