"""
WebSocket Manager for Real-Time Updates

Provides WebSocket connection management for broadcasting
crawl events to connected clients in real-time.

Features:
- Global event broadcasting
- Per-crawl subscriptions
- Auto-reconnect friendly
- Connection health tracking
- Dead connection cleanup
"""

from typing import Dict, Set, Optional, Any
from fastapi import WebSocket
import asyncio
import json
from datetime import datetime
from enum import Enum


class ConnectionState(str, Enum):
    """WebSocket connection states."""
    CONNECTING = "connecting"
    CONNECTED = "connected"
    DISCONNECTING = "disconnecting"
    DISCONNECTED = "disconnected"


class WebSocketManager:
    """
    Manages WebSocket connections for real-time updates.

    Supports:
    - Global connections (receive all events)
    - Crawl-specific connections (receive only events for that crawl)
    - Broadcast to all connected clients
    - Graceful disconnection handling
    """

    def __init__(self):
        # Global connections (receive all events)
        self.global_connections: Set[WebSocket] = set()

        # Crawl-specific connections (crawl_id -> set of websockets)
        self.crawl_connections: Dict[str, Set[WebSocket]] = {}

        # Connection metadata (websocket -> metadata)
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}

        # Lock for thread-safe operations
        self._lock = asyncio.Lock()

        # Statistics
        self.total_connections = 0
        self.total_messages_sent = 0
        self.total_errors = 0

    async def connect(self, websocket: WebSocket, crawl_id: Optional[str] = None):
        """
        Accept a WebSocket connection.

        Args:
            websocket: The WebSocket connection
            crawl_id: Optional crawl ID to subscribe to specific crawl events
        """
        try:
            await websocket.accept()

            async with self._lock:
                # Store connection metadata
                self.connection_metadata[websocket] = {
                    "connected_at": datetime.utcnow().isoformat(),
                    "crawl_id": crawl_id,
                    "state": ConnectionState.CONNECTED,
                    "messages_sent": 0,
                }

                if crawl_id:
                    # Subscribe to specific crawl
                    if crawl_id not in self.crawl_connections:
                        self.crawl_connections[crawl_id] = set()
                    self.crawl_connections[crawl_id].add(websocket)
                else:
                    # Subscribe to global events
                    self.global_connections.add(websocket)

                self.total_connections += 1

            # Send welcome message
            await self._send_json(websocket, {
                "type": "CONNECTED",
                "data": {
                    "message": "Connected to GenCrawl WebSocket",
                    "crawl_id": crawl_id,
                    "timestamp": datetime.utcnow().isoformat(),
                }
            })

            print(f"WebSocket connected: {'crawl ' + crawl_id if crawl_id else 'global'}")

        except Exception as e:
            print(f"Error accepting WebSocket connection: {e}")
            self.total_errors += 1

    async def disconnect(self, websocket: WebSocket, crawl_id: Optional[str] = None):
        """
        Remove a WebSocket connection.

        Args:
            websocket: The WebSocket connection
            crawl_id: Optional crawl ID (for cleanup)
        """
        async with self._lock:
            # Update metadata
            if websocket in self.connection_metadata:
                self.connection_metadata[websocket]["state"] = ConnectionState.DISCONNECTED
                # Get crawl_id from metadata if not provided
                if not crawl_id:
                    crawl_id = self.connection_metadata[websocket].get("crawl_id")
                del self.connection_metadata[websocket]

            # Remove from global connections
            self.global_connections.discard(websocket)

            # Remove from crawl-specific connections
            if crawl_id and crawl_id in self.crawl_connections:
                self.crawl_connections[crawl_id].discard(websocket)
                # Clean up empty sets
                if not self.crawl_connections[crawl_id]:
                    del self.crawl_connections[crawl_id]

        print(f"WebSocket disconnected: {'crawl ' + crawl_id if crawl_id else 'global'}")

    async def broadcast(self, event: Any):
        """
        Broadcast an event to all subscribed clients.

        Args:
            event: The event to broadcast (CrawlEvent or dict)
        """
        # Convert event to dict if needed
        if hasattr(event, 'dict'):
            message = event.dict()
        elif hasattr(event, '__dict__'):
            message = {
                "type": getattr(event, 'event_type', {}).value if hasattr(getattr(event, 'event_type', None), 'value') else str(getattr(event, 'event_type', 'UNKNOWN')),
                "crawl_id": getattr(event, 'crawl_id', None),
                "data": getattr(event, 'data', {}),
                "timestamp": getattr(event, 'timestamp', datetime.utcnow()).isoformat() if hasattr(getattr(event, 'timestamp', None), 'isoformat') else str(getattr(event, 'timestamp', datetime.utcnow())),
            }
        else:
            message = event

        # Ensure timestamp is present
        if "timestamp" not in message:
            message["timestamp"] = datetime.utcnow().isoformat()

        crawl_id = message.get("crawl_id")

        # Send to crawl-specific connections
        if crawl_id and crawl_id in self.crawl_connections:
            dead_connections = await self._broadcast_to_set(
                self.crawl_connections[crawl_id],
                message
            )
            # Clean up dead connections
            async with self._lock:
                self.crawl_connections[crawl_id] -= dead_connections
                for ws in dead_connections:
                    if ws in self.connection_metadata:
                        del self.connection_metadata[ws]

        # Send to global connections
        dead_global = await self._broadcast_to_set(self.global_connections, message)

        # Clean up dead global connections
        async with self._lock:
            self.global_connections -= dead_global
            for ws in dead_global:
                if ws in self.connection_metadata:
                    del self.connection_metadata[ws]

        self.total_messages_sent += 1

    async def _broadcast_to_set(
        self,
        connections: Set[WebSocket],
        message: Dict[str, Any]
    ) -> Set[WebSocket]:
        """
        Broadcast message to a set of connections.

        Returns set of dead connections for cleanup.
        """
        dead_connections: Set[WebSocket] = set()

        for websocket in connections.copy():
            try:
                await self._send_json(websocket, message)

                # Update metadata
                if websocket in self.connection_metadata:
                    self.connection_metadata[websocket]["messages_sent"] += 1

            except Exception as e:
                print(f"Error sending to WebSocket: {e}")
                dead_connections.add(websocket)
                self.total_errors += 1

        return dead_connections

    async def _send_json(self, websocket: WebSocket, data: Dict[str, Any]):
        """Send JSON data to a WebSocket."""
        try:
            await websocket.send_json(data)
        except Exception:
            # Try sending as text if JSON fails
            await websocket.send_text(json.dumps(data, default=str))

    async def send_to_crawl(self, crawl_id: str, message: Dict[str, Any]):
        """
        Send a message to all connections subscribed to a specific crawl.

        Args:
            crawl_id: The crawl ID
            message: The message to send
        """
        if crawl_id not in self.crawl_connections:
            return

        message["crawl_id"] = crawl_id
        if "timestamp" not in message:
            message["timestamp"] = datetime.utcnow().isoformat()

        dead_connections = await self._broadcast_to_set(
            self.crawl_connections[crawl_id],
            message
        )

        # Clean up
        async with self._lock:
            self.crawl_connections[crawl_id] -= dead_connections
            for ws in dead_connections:
                if ws in self.connection_metadata:
                    del self.connection_metadata[ws]

    async def send_to_all(self, message: Dict[str, Any]):
        """
        Send a message to all global connections.

        Args:
            message: The message to send
        """
        if "timestamp" not in message:
            message["timestamp"] = datetime.utcnow().isoformat()

        dead_connections = await self._broadcast_to_set(self.global_connections, message)

        async with self._lock:
            self.global_connections -= dead_connections
            for ws in dead_connections:
                if ws in self.connection_metadata:
                    del self.connection_metadata[ws]

    def get_stats(self) -> Dict[str, Any]:
        """Get WebSocket manager statistics."""
        return {
            "global_connections": len(self.global_connections),
            "crawl_subscriptions": len(self.crawl_connections),
            "total_crawl_connections": sum(
                len(conns) for conns in self.crawl_connections.values()
            ),
            "total_connections_ever": self.total_connections,
            "total_messages_sent": self.total_messages_sent,
            "total_errors": self.total_errors,
            "active_crawl_ids": list(self.crawl_connections.keys()),
        }

    def get_connection_info(self, websocket: WebSocket) -> Optional[Dict[str, Any]]:
        """Get information about a specific connection."""
        return self.connection_metadata.get(websocket)

    async def cleanup_dead_connections(self):
        """
        Clean up any dead connections.

        Called periodically or after errors.
        """
        async with self._lock:
            # Check global connections
            dead_global = set()
            for ws in self.global_connections:
                try:
                    # Try to send a ping
                    await asyncio.wait_for(
                        ws.send_text(""),
                        timeout=1.0
                    )
                except Exception:
                    dead_global.add(ws)

            self.global_connections -= dead_global

            # Check crawl connections
            for crawl_id in list(self.crawl_connections.keys()):
                dead_crawl = set()
                for ws in self.crawl_connections[crawl_id]:
                    try:
                        await asyncio.wait_for(
                            ws.send_text(""),
                            timeout=1.0
                        )
                    except Exception:
                        dead_crawl.add(ws)

                self.crawl_connections[crawl_id] -= dead_crawl

                # Clean up empty sets
                if not self.crawl_connections[crawl_id]:
                    del self.crawl_connections[crawl_id]

            # Clean up metadata
            for ws in dead_global:
                if ws in self.connection_metadata:
                    del self.connection_metadata[ws]


# Global singleton instance
ws_manager = WebSocketManager()
