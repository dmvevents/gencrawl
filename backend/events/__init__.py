"""Event system for GenCrawl."""

from .event_bus import (
    EventBus,
    CrawlEvent,
    EventType,
    EventHistory,
    event_bus,
    emit_state_change,
    emit_progress_update,
    emit_document_found,
    emit_quality_assessed,
    emit_error,
    emit_metrics_update,
)

__all__ = [
    "EventBus",
    "CrawlEvent",
    "EventType",
    "EventHistory",
    "event_bus",
    "emit_state_change",
    "emit_progress_update",
    "emit_document_found",
    "emit_quality_assessed",
    "emit_error",
    "emit_metrics_update",
]
