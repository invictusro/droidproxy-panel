import { useEffect, useState, useRef, useCallback } from 'react';
import { Centrifuge, Subscription } from 'centrifuge';

export interface PhoneStatus {
  type: string;
  phone_id: string;
  status: 'online' | 'offline';
  active_connections: number;
  total_connections: number;
  rotation_capability?: string;
  sim_country?: string;
  sim_carrier?: string;
  timestamp: number;
}

// Use env var override if available, otherwise use the URL from API
const CENTRIFUGO_URL_OVERRIDE = import.meta.env.VITE_CENTRIFUGO_URL;

const STATUS_REQUEST_COOLDOWN_MS = 10_000; // 10 second cooldown

export function useCentrifugo(phoneIds: string[], token: string | null, wsUrl: string | null) {
  // Prefer env override, fallback to API-provided URL
  const effectiveWsUrl = CENTRIFUGO_URL_OVERRIDE || wsUrl;
  const [statuses, setStatuses] = useState<Record<string, PhoneStatus>>({});
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<Centrifuge | null>(null);
  const subscriptionsRef = useRef<Map<string, Subscription>>(new Map());
  const lastStatusRequestRef = useRef<Record<string, number>>({});

  const handleStatusUpdate = useCallback((phoneId: string, data: PhoneStatus) => {
    setStatuses(prev => {
      const existing = prev[phoneId];
      // Merge with existing data to preserve fields not included in heartbeats
      // (e.g., rotation_capability is only sent in full status updates)
      return {
        ...prev,
        [phoneId]: {
          ...existing,
          ...data,
        },
      };
    });
  }, []);

  useEffect(() => {
    console.log('[Centrifugo] Hook called with:', { token: token ? 'present' : 'null', effectiveWsUrl, phoneIdsCount: phoneIds.length });

    if (!token || !effectiveWsUrl || phoneIds.length === 0) {
      console.log('[Centrifugo] Missing requirements, not connecting');
      return;
    }

    // Convert HTTP URL to WebSocket URL
    const centrifugoWsUrl = effectiveWsUrl
      .replace('http://', 'ws://')
      .replace('https://', 'wss://') + '/connection/websocket';

    console.log('[Centrifugo] Connecting to:', centrifugoWsUrl);

    // Create client if not exists
    if (!clientRef.current) {
      const client = new Centrifuge(centrifugoWsUrl, {
        token,
      });

      client.on('connected', () => {
        console.log('[Centrifugo] Connected!');
        setConnected(true);
      });

      client.on('disconnected', (ctx) => {
        console.log('[Centrifugo] Disconnected:', ctx);
        setConnected(false);
      });

      client.on('error', (ctx) => {
        console.error('[Centrifugo] Error:', ctx);
      });

      client.connect();
      clientRef.current = client;
    }

    const client = clientRef.current;

    // Subscribe to new phone channels
    phoneIds.forEach(phoneId => {
      if (!subscriptionsRef.current.has(phoneId)) {
        const channel = `phone:${phoneId}`;
        const sub = client.newSubscription(channel);

        sub.on('publication', (ctx) => {
          const data = ctx.data as PhoneStatus;
          // Handle both full status updates and lightweight heartbeats
          if (data.type === 'status' || data.type === 'heartbeat') {
            handleStatusUpdate(phoneId, data);
          }
        });

        sub.on('subscribed', () => {
          console.log(`Subscribed to ${channel}`);
          // Request immediate status from phone (rate limited to 10s)
          const now = Date.now();
          const lastRequest = lastStatusRequestRef.current[phoneId] || 0;
          if (now - lastRequest >= STATUS_REQUEST_COOLDOWN_MS) {
            lastStatusRequestRef.current[phoneId] = now;
            client.publish(channel, { command: 'request_status' }).catch(err => {
              console.log(`Failed to request status for ${channel}:`, err);
            });
          } else {
            console.log(`Status request for ${channel} rate limited`);
          }
        });

        sub.subscribe();
        subscriptionsRef.current.set(phoneId, sub);
      }
    });

    // Unsubscribe from removed phones
    subscriptionsRef.current.forEach((sub, phoneId) => {
      if (!phoneIds.includes(phoneId)) {
        sub.unsubscribe();
        subscriptionsRef.current.delete(phoneId);
      }
    });

    return () => {
      // Cleanup on unmount
      subscriptionsRef.current.forEach(sub => sub.unsubscribe());
      subscriptionsRef.current.clear();
      if (clientRef.current) {
        clientRef.current.disconnect();
        clientRef.current = null;
      }
    };
  }, [phoneIds, token, effectiveWsUrl, handleStatusUpdate]);

  return { statuses, connected };
}
