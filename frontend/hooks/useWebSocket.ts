'use client';

/**
 * React Hook for WebSocket Connection
 *
 * Provides a convenient way to use WebSocket in React components with:
 * - Automatic connection management
 * - Connection state tracking
 * - Event subscription
 * - Cleanup on unmount
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  WebSocketClient,
  ConnectionState,
  WebSocketMessage,
  EventCallback,
  getGlobalWebSocketClient,
} from '../lib/websocket/client';

interface UseWebSocketOptions {
  crawlId?: string;
  autoConnect?: boolean;
  onMessage?: EventCallback;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: unknown) => void;
}

interface UseWebSocketReturn {
  connected: boolean;
  connectionState: ConnectionState;
  client: WebSocketClient;
  connect: () => void;
  disconnect: () => void;
  send: (data: unknown) => void;
  on: (eventType: string, callback: EventCallback) => void;
  off: (eventType: string, callback: EventCallback) => void;
}

/**
 * Hook for WebSocket connection
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    crawlId,
    autoConnect = true,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [connected, setConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');

  // Use ref to maintain client instance across re-renders
  const clientRef = useRef<WebSocketClient | null>(null);

  // Get or create client
  const getClient = useCallback(() => {
    if (!clientRef.current) {
      clientRef.current = crawlId
        ? new WebSocketClient(crawlId)
        : getGlobalWebSocketClient();
    }
    return clientRef.current;
  }, [crawlId]);

  // Setup event listeners
  useEffect(() => {
    const client = getClient();

    // State change handler
    const handleStateChange = (message: WebSocketMessage) => {
      const state = message.data?.state as ConnectionState;
      setConnectionState(state);
      setConnected(state === 'connected');
    };

    // Connection handler
    const handleConnect = () => {
      setConnected(true);
      setConnectionState('connected');
      onConnect?.();
    };

    // Disconnection handler
    const handleDisconnect = () => {
      setConnected(false);
      setConnectionState('disconnected');
      onDisconnect?.();
    };

    // Error handler
    const handleError = (message: WebSocketMessage) => {
      onError?.(message.data?.error);
    };

    // Message handler
    const handleMessage = (message: WebSocketMessage) => {
      onMessage?.(message);
    };

    // Subscribe to events
    client.on('stateChange', handleStateChange);
    client.on('connected', handleConnect);
    client.on('disconnected', handleDisconnect);
    client.on('error', handleError);

    if (onMessage) {
      client.on('*', handleMessage);
    }

    // Auto-connect if enabled
    if (autoConnect) {
      client.connect();
    }

    // Cleanup
    return () => {
      client.off('stateChange', handleStateChange);
      client.off('connected', handleConnect);
      client.off('disconnected', handleDisconnect);
      client.off('error', handleError);

      if (onMessage) {
        client.off('*', handleMessage);
      }

      // Only close if it's a crawl-specific client
      if (crawlId && clientRef.current) {
        clientRef.current.close();
        clientRef.current = null;
      }
    };
  }, [crawlId, autoConnect, onMessage, onConnect, onDisconnect, onError, getClient]);

  // Connect function
  const connect = useCallback(() => {
    getClient().connect();
  }, [getClient]);

  // Disconnect function
  const disconnect = useCallback(() => {
    getClient().close();
  }, [getClient]);

  // Send function
  const send = useCallback((data: unknown) => {
    getClient().send(data);
  }, [getClient]);

  // Subscribe to event
  const on = useCallback((eventType: string, callback: EventCallback) => {
    getClient().on(eventType, callback);
  }, [getClient]);

  // Unsubscribe from event
  const off = useCallback((eventType: string, callback: EventCallback) => {
    getClient().off(eventType, callback);
  }, [getClient]);

  return {
    connected,
    connectionState,
    client: getClient(),
    connect,
    disconnect,
    send,
    on,
    off,
  };
}

/**
 * Hook specifically for crawl events
 */
export function useCrawlEvents(crawlId: string) {
  const [events, setEvents] = useState<WebSocketMessage[]>([]);
  const [latestState, setLatestState] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, unknown> | null>(null);
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    // Add to events list
    setEvents(prev => [...prev.slice(-99), message]);

    // Update state-specific values
    switch (message.type) {
      case 'state_change':
      case 'STATE_CHANGE':
        setLatestState(message.data?.to_state as string);
        break;

      case 'progress_update':
      case 'PROGRESS_UPDATE':
        setProgress(message.data || null);
        break;

      case 'metrics_update':
      case 'METRICS_UPDATE':
        setMetrics(message.data || null);
        break;
    }
  }, []);

  const { connected, connectionState, client } = useWebSocket({
    crawlId,
    onMessage: handleMessage,
  });

  return {
    connected,
    connectionState,
    client,
    events,
    latestState,
    progress,
    metrics,
    clearEvents: () => setEvents([]),
  };
}

export default useWebSocket;
