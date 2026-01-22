/**
 * WebSocket Client for Real-Time Updates
 *
 * Provides a robust WebSocket client with:
 * - Auto-reconnect with exponential backoff
 * - Event-based messaging
 * - Connection state tracking
 * - Ping/pong heartbeat
 * - Type-safe event handling
 */

import { WS_BASE_URL } from '../api/config';

// Connection states
export type ConnectionState = 'connecting' | 'connected' | 'disconnecting' | 'disconnected' | 'reconnecting';

// Event types from backend
export type EventType =
  | 'CONNECTED'
  | 'state_change'
  | 'substate_change'
  | 'progress_update'
  | 'milestone_reached'
  | 'document_found'
  | 'document_downloaded'
  | 'document_processed'
  | 'extraction_started'
  | 'extraction_complete'
  | 'extraction_failed'
  | 'quality_assessed'
  | 'page_crawled'
  | 'page_failed'
  | 'error'
  | 'warning'
  | 'metrics_update'
  | 'crawl_paused'
  | 'crawl_resumed'
  | 'crawl_cancelled'
  | 'crawl_completed'
  | 'METRICS_UPDATE'
  | 'STATE_CHANGE'
  | 'PROGRESS_UPDATE';

// Event message structure
export interface WebSocketMessage {
  type: EventType | string;
  crawl_id?: string;
  data?: Record<string, unknown>;
  timestamp?: string;
  event_id?: string;
}

// Event listener callback
export type EventCallback = (message: WebSocketMessage) => void;

/**
 * WebSocket client with auto-reconnect
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private crawlId?: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private isManualClose = false;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private lastPongTime: number = Date.now();

  constructor(crawlId?: string) {
    this.crawlId = crawlId;
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    this.isManualClose = false;
    this.connectionState = 'connecting';
    this.emit('stateChange', { state: 'connecting' });

    const url = this.crawlId
      ? `${WS_BASE_URL}/api/v1/ws/crawl/${this.crawlId}`
      : `${WS_BASE_URL}/api/v1/ws/global`;

    console.log(`Connecting to WebSocket: ${url}`);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket open
   */
  private handleOpen(): void {
    console.log('WebSocket connected');
    this.connectionState = 'connected';
    this.reconnectAttempts = 0;
    this.lastPongTime = Date.now();

    this.emit('connected', { timestamp: new Date().toISOString() });
    this.emit('stateChange', { state: 'connected' });

    // Start ping interval
    this.startPingInterval();
  }

  /**
   * Handle incoming message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      // Handle pong response
      if (event.data === 'pong') {
        this.lastPongTime = Date.now();
        return;
      }

      const message: WebSocketMessage = JSON.parse(event.data);

      // Emit to type-specific listeners
      if (message.type) {
        this.emit(message.type, message as unknown as Record<string, unknown>);
      }

      // Emit to wildcard listeners
      this.emit('*', message as unknown as Record<string, unknown>);

    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(event: CloseEvent): void {
    console.log(`WebSocket closed: code=${event.code}, reason=${event.reason}`);

    this.connectionState = 'disconnected';
    this.stopPingInterval();

    this.emit('disconnected', {
      code: event.code,
      reason: event.reason,
      timestamp: new Date().toISOString()
    });
    this.emit('stateChange', { state: 'disconnected' });

    // Attempt reconnect if not manually closed
    if (!this.isManualClose) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    this.emit('error', { error: event });
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      this.emit('reconnectFailed', {
        attempts: this.reconnectAttempts,
        timestamp: new Date().toISOString()
      });
      return;
    }

    this.connectionState = 'reconnecting';
    this.emit('stateChange', { state: 'reconnecting' });

    // Exponential backoff
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    this.reconnectAttempts++;
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.emit('reconnecting', {
      attempt: this.reconnectAttempts,
      delay,
      timestamp: new Date().toISOString()
    });

    setTimeout(() => {
      if (!this.isManualClose) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Start ping interval for connection health
   */
  private startPingInterval(): void {
    this.stopPingInterval();

    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Check if we've received a pong recently
        const timeSinceLastPong = Date.now() - this.lastPongTime;
        if (timeSinceLastPong > 60000) {
          console.log('Connection appears dead, reconnecting...');
          this.ws?.close();
          return;
        }

        // Send ping
        try {
          this.ws.send('ping');
        } catch (error) {
          console.error('Failed to send ping:', error);
        }
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Subscribe to event type
   */
  on(eventType: string, callback: EventCallback): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
  }

  /**
   * Unsubscribe from event type
   */
  off(eventType: string, callback: EventCallback): void {
    this.listeners.get(eventType)?.delete(callback);
  }

  /**
   * Emit event to listeners
   */
  private emit(eventType: string, payload: Record<string, unknown> | WebSocketMessage): void {
    const listeners = this.listeners.get(eventType);
    if (!listeners) {
      return;
    }

    const message: WebSocketMessage =
      (payload as WebSocketMessage).type !== undefined
        ? (payload as WebSocketMessage)
        : ({ type: eventType, data: payload } as WebSocketMessage);

    listeners.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  /**
   * Send message to server
   */
  send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected, message not sent');
    }
  }

  /**
   * Close connection
   */
  close(): void {
    console.log('Closing WebSocket connection');
    this.isManualClose = true;
    this.connectionState = 'disconnecting';
    this.emit('stateChange', { state: 'disconnecting' });
    this.stopPingInterval();
    this.ws?.close();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Export singleton for global events
let globalClient: WebSocketClient | null = null;

export function getGlobalWebSocketClient(): WebSocketClient {
  if (!globalClient) {
    globalClient = new WebSocketClient();
  }
  return globalClient;
}

export function connectGlobalWebSocket(): WebSocketClient {
  const client = getGlobalWebSocketClient();
  if (!client.isConnected()) {
    client.connect();
  }
  return client;
}
