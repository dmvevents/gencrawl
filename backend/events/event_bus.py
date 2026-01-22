"""
Event Bus for real-time crawl updates and WebSocket broadcasting.
"""

import asyncio
import json
from datetime import datetime
from typing import Dict, Any, List, Optional, Set, Callable
from collections import deque
from enum import Enum
from pydantic import BaseModel, Field
from uuid import uuid4


class EventType(str, Enum):
    """Types of crawl events."""
    # State events
    STATE_CHANGE = "state_change"
    SUBSTATE_CHANGE = "substate_change"

    # Progress events
    PROGRESS_UPDATE = "progress_update"
    MILESTONE_REACHED = "milestone_reached"

    # Document events
    DOCUMENT_FOUND = "document_found"
    DOCUMENT_DOWNLOADED = "document_downloaded"
    DOCUMENT_PROCESSED = "document_processed"

    # Extraction events
    EXTRACTION_STARTED = "extraction_started"
    EXTRACTION_COMPLETE = "extraction_complete"
    EXTRACTION_FAILED = "extraction_failed"

    # Quality events
    QUALITY_ASSESSED = "quality_assessed"
    QUALITY_THRESHOLD_PASSED = "quality_threshold_passed"
    QUALITY_THRESHOLD_FAILED = "quality_threshold_failed"

    # Page events
    PAGE_CRAWLED = "page_crawled"
    PAGE_FAILED = "page_failed"

    # Error events
    ERROR = "error"
    WARNING = "warning"

    # System events
    METRICS_UPDATE = "metrics_update"
    CRAWL_PAUSED = "crawl_paused"
    CRAWL_RESUMED = "crawl_resumed"
    CRAWL_CANCELLED = "crawl_cancelled"
    CRAWL_COMPLETED = "crawl_completed"


class CrawlEvent(BaseModel):
    """Represents a crawl event."""
    event_id: str = Field(default_factory=lambda: str(uuid4()))
    crawl_id: str
    event_type: EventType
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    data: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    def to_json(self) -> str:
        """Convert event to JSON string."""
        return json.dumps({
            "event_id": self.event_id,
            "crawl_id": self.crawl_id,
            "event_type": self.event_type,
            "timestamp": self.timestamp.isoformat(),
            "data": self.data,
            "metadata": self.metadata,
        })

    @classmethod
    def from_json(cls, json_str: str) -> "CrawlEvent":
        """Create event from JSON string."""
        data = json.loads(json_str)
        data["timestamp"] = datetime.fromisoformat(data["timestamp"])
        return cls(**data)


class EventHistory:
    """Maintains event history with size limits."""

    def __init__(self, max_events: int = 1000):
        self.events: deque = deque(maxlen=max_events)
        self.events_by_type: Dict[EventType, deque] = {}

    def add(self, event: CrawlEvent):
        """Add event to history."""
        self.events.append(event)

        # Add to type-specific history
        if event.event_type not in self.events_by_type:
            self.events_by_type[event.event_type] = deque(maxlen=100)

        self.events_by_type[event.event_type].append(event)

    def get_recent(self, limit: int = 100) -> List[CrawlEvent]:
        """Get most recent events."""
        return list(self.events)[-limit:]

    def get_by_type(self, event_type: EventType, limit: int = 100) -> List[CrawlEvent]:
        """Get recent events of specific type."""
        if event_type not in self.events_by_type:
            return []
        return list(self.events_by_type[event_type])[-limit:]

    def get_since(self, timestamp: datetime) -> List[CrawlEvent]:
        """Get events since timestamp."""
        return [e for e in self.events if e.timestamp >= timestamp]

    def clear(self):
        """Clear event history."""
        self.events.clear()
        self.events_by_type.clear()


class EventBus:
    """
    Event bus for publishing and subscribing to crawl events.
    Supports WebSocket broadcasting and event history.
    """

    def __init__(self):
        # Event history per crawl
        self.histories: Dict[str, EventHistory] = {}

        # Subscribers (async callbacks)
        self.subscribers: Dict[str, List[Callable]] = {}

        # WebSocket connections per crawl
        self.websockets: Dict[str, Set[Any]] = {}

        # Global subscribers (receive all events)
        self.global_subscribers: List[Callable] = []

        # WebSocket manager reference (set externally)
        self.ws_manager = None

    def set_ws_manager(self, ws_manager):
        """Set the WebSocket manager for broadcasting."""
        self.ws_manager = ws_manager

    async def publish(self, event: CrawlEvent):
        """Publish an event to all subscribers."""
        crawl_id = event.crawl_id

        # Add to history
        if crawl_id not in self.histories:
            self.histories[crawl_id] = EventHistory()
        self.histories[crawl_id].add(event)

        # Notify crawl-specific subscribers
        if crawl_id in self.subscribers:
            for callback in self.subscribers[crawl_id]:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(event)
                    else:
                        callback(event)
                except Exception as e:
                    print(f"Error in subscriber callback: {e}")

        # Notify global subscribers
        for callback in self.global_subscribers:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(event)
                else:
                    callback(event)
            except Exception as e:
                print(f"Error in global subscriber callback: {e}")

        # Broadcast to WebSockets (legacy)
        await self._broadcast_to_websockets(event)

        # Broadcast via WebSocket manager (new)
        await self._broadcast_via_ws_manager(event)

    async def _broadcast_via_ws_manager(self, event: CrawlEvent):
        """Broadcast event via the WebSocket manager."""
        if not self.ws_manager:
            # Try to get ws_manager lazily
            try:
                from websocket.manager import ws_manager
                self.ws_manager = ws_manager
            except ImportError:
                return

        if self.ws_manager:
            try:
                await self.ws_manager.broadcast(event)
            except Exception as e:
                print(f"Error broadcasting via WebSocket manager: {e}")

    async def _broadcast_to_websockets(self, event: CrawlEvent):
        """Broadcast event to WebSocket connections."""
        crawl_id = event.crawl_id

        if crawl_id not in self.websockets:
            return

        # Remove disconnected sockets
        disconnected = set()

        for websocket in self.websockets[crawl_id]:
            try:
                await websocket.send_text(event.to_json())
            except Exception:
                disconnected.add(websocket)

        # Clean up disconnected sockets
        self.websockets[crawl_id] -= disconnected

    def subscribe(self, crawl_id: str, callback: Callable):
        """Subscribe to events for a specific crawl."""
        if crawl_id not in self.subscribers:
            self.subscribers[crawl_id] = []

        self.subscribers[crawl_id].append(callback)

    def subscribe_global(self, callback: Callable):
        """Subscribe to all events."""
        self.global_subscribers.append(callback)

    def unsubscribe(self, crawl_id: str, callback: Callable):
        """Unsubscribe from crawl events."""
        if crawl_id in self.subscribers:
            self.subscribers[crawl_id].remove(callback)

    def add_websocket(self, crawl_id: str, websocket: Any):
        """Add WebSocket connection for crawl."""
        if crawl_id not in self.websockets:
            self.websockets[crawl_id] = set()

        self.websockets[crawl_id].add(websocket)

    def remove_websocket(self, crawl_id: str, websocket: Any):
        """Remove WebSocket connection."""
        if crawl_id in self.websockets:
            self.websockets[crawl_id].discard(websocket)

    def get_history(self, crawl_id: str, limit: int = 100) -> List[CrawlEvent]:
        """Get event history for a crawl."""
        if crawl_id not in self.histories:
            return []

        return self.histories[crawl_id].get_recent(limit)

    def get_events_by_type(
        self,
        crawl_id: str,
        event_type: EventType,
        limit: int = 100
    ) -> List[CrawlEvent]:
        """Get events of specific type for a crawl."""
        if crawl_id not in self.histories:
            return []

        return self.histories[crawl_id].get_by_type(event_type, limit)

    def get_events_since(self, crawl_id: str, timestamp: datetime) -> List[CrawlEvent]:
        """Get events since timestamp."""
        if crawl_id not in self.histories:
            return []

        return self.histories[crawl_id].get_since(timestamp)

    def clear_history(self, crawl_id: str):
        """Clear event history for a crawl."""
        if crawl_id in self.histories:
            self.histories[crawl_id].clear()

    def cleanup_crawl(self, crawl_id: str):
        """Clean up all data for a crawl."""
        if crawl_id in self.histories:
            del self.histories[crawl_id]

        if crawl_id in self.subscribers:
            del self.subscribers[crawl_id]

        if crawl_id in self.websockets:
            del self.websockets[crawl_id]


# Global event bus instance
event_bus = EventBus()


# Helper functions for common events
async def emit_state_change(crawl_id: str, from_state: str, to_state: str, metadata: Dict = None):
    """Emit state change event."""
    event = CrawlEvent(
        crawl_id=crawl_id,
        event_type=EventType.STATE_CHANGE,
        data={
            "from_state": from_state,
            "to_state": to_state,
        },
        metadata=metadata or {}
    )
    await event_bus.publish(event)


async def emit_progress_update(crawl_id: str, progress: Dict[str, Any]):
    """Emit progress update event."""
    event = CrawlEvent(
        crawl_id=crawl_id,
        event_type=EventType.PROGRESS_UPDATE,
        data=progress
    )
    await event_bus.publish(event)


async def emit_document_found(crawl_id: str, url: str, doc_type: str, metadata: Dict = None):
    """Emit document found event."""
    event = CrawlEvent(
        crawl_id=crawl_id,
        event_type=EventType.DOCUMENT_FOUND,
        data={
            "url": url,
            "document_type": doc_type,
        },
        metadata=metadata or {}
    )
    await event_bus.publish(event)


async def emit_quality_assessed(crawl_id: str, doc_id: str, score: float, passed: bool):
    """Emit quality assessment event."""
    event = CrawlEvent(
        crawl_id=crawl_id,
        event_type=EventType.QUALITY_ASSESSED,
        data={
            "doc_id": doc_id,
            "quality_score": score,
            "passed": passed,
        }
    )
    await event_bus.publish(event)


async def emit_error(crawl_id: str, error_type: str, message: str, context: Dict = None):
    """Emit error event."""
    event = CrawlEvent(
        crawl_id=crawl_id,
        event_type=EventType.ERROR,
        data={
            "error_type": error_type,
            "message": message,
        },
        metadata=context or {}
    )
    await event_bus.publish(event)


async def emit_metrics_update(crawl_id: str, metrics: Dict[str, Any]):
    """Emit metrics update event."""
    event = CrawlEvent(
        crawl_id=crawl_id,
        event_type=EventType.METRICS_UPDATE,
        data=metrics
    )
    await event_bus.publish(event)
