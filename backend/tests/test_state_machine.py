"""
Unit tests for state machine, metrics, and event system.
"""

import pytest
import asyncio
from datetime import datetime

from models.crawl_state import (
    CrawlState,
    CrawlSubstate,
    CrawlStateData,
    CrawlStateMachine,
    CrawlProgress,
)
from utils.metrics import MetricsCollector, MetricsAggregator
from events.event_bus import (
    EventBus,
    CrawlEvent,
    EventType,
    emit_state_change,
    emit_progress_update,
)


class TestCrawlStateMachine:
    """Test state machine transitions."""

    def test_valid_transition(self):
        """Test valid state transition."""
        state_data = CrawlStateData(crawl_id="test-1")
        machine = CrawlStateMachine(state_data)

        # Valid transition: QUEUED -> INITIALIZING
        assert machine.can_transition(CrawlState.INITIALIZING)
        machine.transition(CrawlState.INITIALIZING)
        assert state_data.current_state == CrawlState.INITIALIZING

    def test_invalid_transition(self):
        """Test invalid state transition."""
        state_data = CrawlStateData(crawl_id="test-2")
        machine = CrawlStateMachine(state_data)

        # Invalid transition: QUEUED -> COMPLETED
        assert not machine.can_transition(CrawlState.COMPLETED)
        with pytest.raises(ValueError):
            machine.transition(CrawlState.COMPLETED)

    def test_state_history(self):
        """Test state transition history."""
        state_data = CrawlStateData(crawl_id="test-3")
        machine = CrawlStateMachine(state_data)

        # Perform transitions
        machine.transition(CrawlState.INITIALIZING)
        machine.transition(CrawlState.CRAWLING)
        machine.transition(CrawlState.EXTRACTING)

        # Check history
        assert len(state_data.state_history) == 3
        assert state_data.state_history[0].from_state == CrawlState.QUEUED
        assert state_data.state_history[0].to_state == CrawlState.INITIALIZING
        assert state_data.state_history[-1].to_state == CrawlState.EXTRACTING

    def test_terminal_states(self):
        """Test terminal state detection."""
        state_data = CrawlStateData(crawl_id="test-4")
        machine = CrawlStateMachine(state_data)

        # Not terminal initially
        assert not machine.is_terminal_state()

        # Navigate to terminal state
        machine.transition(CrawlState.INITIALIZING)
        machine.transition(CrawlState.CRAWLING)
        machine.transition(CrawlState.PAUSED)
        machine.transition(CrawlState.CANCELLED)

        # Now terminal
        assert machine.is_terminal_state()

    def test_substates(self):
        """Test substate setting."""
        state_data = CrawlStateData(crawl_id="test-5")
        machine = CrawlStateMachine(state_data)

        # Transition to CRAWLING
        machine.transition(CrawlState.INITIALIZING)
        machine.transition(CrawlState.CRAWLING)

        # Set valid substate
        machine.set_substate(CrawlSubstate.DISCOVERING_URLS)
        assert state_data.current_substate == CrawlSubstate.DISCOVERING_URLS

        # Invalid substate for current state
        with pytest.raises(ValueError):
            machine.set_substate(CrawlSubstate.PDF_EXTRACTION)

    def test_pause_resume(self):
        """Test pause and resume capabilities."""
        state_data = CrawlStateData(crawl_id="test-6")
        machine = CrawlStateMachine(state_data)

        # Can't pause in QUEUED
        assert not machine.can_pause()

        # Navigate to CRAWLING
        machine.transition(CrawlState.INITIALIZING)
        machine.transition(CrawlState.CRAWLING)

        # Can pause now
        assert machine.can_pause()
        assert not machine.can_resume()

        # Pause
        machine.transition(CrawlState.PAUSED)
        assert not machine.can_pause()
        assert machine.can_resume()

    def test_duration_calculation(self):
        """Test duration calculation."""
        state_data = CrawlStateData(crawl_id="test-7")
        machine = CrawlStateMachine(state_data)

        # Start crawl
        machine.transition(CrawlState.INITIALIZING)
        assert state_data.started_at is not None

        # Duration should be calculated
        duration = state_data.duration_seconds
        assert duration is not None
        assert duration >= 0


class TestCrawlProgress:
    """Test progress tracking."""

    def test_progress_percentage(self):
        """Test percentage calculation."""
        progress = CrawlProgress(total=100, completed=25, failed=5)

        assert progress.percentage == 25.0
        assert progress.remaining == 70

    def test_zero_total(self):
        """Test with zero total."""
        progress = CrawlProgress(total=0, completed=0, failed=0)
        assert progress.percentage == 0.0
        assert progress.remaining == 0


class TestMetricsCollector:
    """Test metrics collection."""

    def test_record_metric(self):
        """Test recording metrics."""
        collector = MetricsCollector("test-crawl")

        # Record some metrics
        collector.record("pages_per_second", 5.2)
        collector.record("pages_per_second", 5.8)
        collector.record("pages_per_second", 4.9)

        # Get latest
        latest = collector.metrics["pages_per_second"].get_latest()
        assert latest == 4.9

        # Get average
        avg = collector.metrics["pages_per_second"].get_average(300)
        assert avg is not None
        assert 4.0 < avg < 6.0

    def test_system_metrics(self):
        """Test system resource metrics."""
        collector = MetricsCollector("test-crawl")

        # Record system metrics
        collector.record_system_metrics()

        # Check metrics were recorded
        assert collector.metrics["memory_usage_mb"].get_latest() is not None
        assert collector.metrics["cpu_usage_percent"].get_latest() is not None

    def test_throughput_calculation(self):
        """Test throughput calculation."""
        collector = MetricsCollector("test-crawl")

        # Calculate throughput
        start_time = datetime.utcnow()
        throughput = collector.calculate_throughput(100, start_time)

        assert throughput > 0

    def test_success_rate(self):
        """Test success rate calculation."""
        collector = MetricsCollector("test-crawl")

        # Calculate success rate
        rate = collector.calculate_success_rate(95, 5)

        assert rate == 95.0
        assert collector.metrics["success_rate"].get_latest() == 95.0
        assert collector.metrics["error_rate"].get_latest() == 5.0

    def test_quality_metrics(self):
        """Test quality metrics."""
        collector = MetricsCollector("test-crawl")

        # Calculate quality metrics
        scores = [0.8, 0.9, 0.7, 0.85, 0.75, 0.6]
        collector.calculate_quality_metrics(scores, threshold=0.7)

        avg_score = collector.metrics["quality_score"].get_latest()
        pass_rate = collector.metrics["quality_pass_rate"].get_latest()

        assert avg_score is not None
        assert 0.7 < avg_score < 0.85
        assert pass_rate == (5 / 6) * 100  # 5 out of 6 pass

    def test_snapshot(self):
        """Test metrics snapshot."""
        collector = MetricsCollector("test-crawl")

        # Record some metrics
        collector.record("pages_per_second", 5.0)
        collector.record_system_metrics()

        # Get snapshot
        snapshot = collector.get_snapshot()

        assert snapshot["crawl_id"] == "test-crawl"
        assert "metrics" in snapshot
        assert "pages_per_second" in snapshot["metrics"]


class TestMetricsAggregator:
    """Test metrics aggregation."""

    def test_get_or_create(self):
        """Test getting or creating collector."""
        aggregator = MetricsAggregator()

        # Get collector (creates if not exists)
        collector1 = aggregator.get_or_create_collector("crawl-1")
        assert collector1 is not None

        # Get same collector again
        collector2 = aggregator.get_or_create_collector("crawl-1")
        assert collector1 is collector2

    def test_remove_collector(self):
        """Test removing collector."""
        aggregator = MetricsAggregator()

        # Create collector
        aggregator.get_or_create_collector("crawl-1")
        assert "crawl-1" in aggregator.collectors

        # Remove it
        aggregator.remove_collector("crawl-1")
        assert "crawl-1" not in aggregator.collectors

    def test_system_summary(self):
        """Test system-wide summary."""
        aggregator = MetricsAggregator()

        # Create multiple collectors
        for i in range(3):
            collector = aggregator.get_or_create_collector(f"crawl-{i}")
            collector.record("memory_usage_mb", 100.0 * (i + 1))
            collector.record("cpu_usage_percent", 20.0 * (i + 1))

        # Get system summary
        summary = aggregator.get_system_summary()

        assert summary["active_crawls"] == 3
        assert summary["total_memory_mb"] == 600.0  # 100 + 200 + 300


@pytest.mark.asyncio
class TestEventBus:
    """Test event bus."""

    async def test_publish_event(self):
        """Test publishing events."""
        bus = EventBus()
        events_received = []

        # Subscribe to events
        def on_event(event):
            events_received.append(event)

        bus.subscribe("crawl-1", on_event)

        # Publish event
        event = CrawlEvent(
            crawl_id="crawl-1",
            event_type=EventType.STATE_CHANGE,
            data={"from_state": "QUEUED", "to_state": "INITIALIZING"}
        )
        await bus.publish(event)

        # Check event was received
        assert len(events_received) == 1
        assert events_received[0].crawl_id == "crawl-1"

    async def test_event_history(self):
        """Test event history."""
        bus = EventBus()

        # Publish multiple events
        for i in range(5):
            event = CrawlEvent(
                crawl_id="crawl-1",
                event_type=EventType.PAGE_CRAWLED,
                data={"url": f"https://example.com/page{i}"}
            )
            await bus.publish(event)

        # Get history
        history = bus.get_history("crawl-1", limit=10)
        assert len(history) == 5

    async def test_event_filtering(self):
        """Test event type filtering."""
        bus = EventBus()

        # Publish different event types
        await bus.publish(CrawlEvent(
            crawl_id="crawl-1",
            event_type=EventType.PAGE_CRAWLED,
            data={}
        ))
        await bus.publish(CrawlEvent(
            crawl_id="crawl-1",
            event_type=EventType.STATE_CHANGE,
            data={}
        ))
        await bus.publish(CrawlEvent(
            crawl_id="crawl-1",
            event_type=EventType.PAGE_CRAWLED,
            data={}
        ))

        # Get only page events
        page_events = bus.get_events_by_type("crawl-1", EventType.PAGE_CRAWLED)
        assert len(page_events) == 2

    async def test_global_subscription(self):
        """Test global event subscription."""
        bus = EventBus()
        global_events = []

        # Subscribe globally
        def on_global_event(event):
            global_events.append(event)

        bus.subscribe_global(on_global_event)

        # Publish events for different crawls
        await bus.publish(CrawlEvent(crawl_id="crawl-1", event_type=EventType.PAGE_CRAWLED, data={}))
        await bus.publish(CrawlEvent(crawl_id="crawl-2", event_type=EventType.PAGE_CRAWLED, data={}))

        # Global subscriber should receive all
        assert len(global_events) == 2

    async def test_cleanup(self):
        """Test crawl cleanup."""
        bus = EventBus()

        # Create some data
        await bus.publish(CrawlEvent(crawl_id="crawl-1", event_type=EventType.PAGE_CRAWLED, data={}))
        bus.subscribe("crawl-1", lambda e: None)

        # Cleanup
        bus.cleanup_crawl("crawl-1")

        # Data should be gone
        assert "crawl-1" not in bus.histories
        assert "crawl-1" not in bus.subscribers


@pytest.mark.asyncio
class TestHelperFunctions:
    """Test helper functions."""

    async def test_emit_state_change(self):
        """Test state change emission."""
        from events.event_bus import event_bus

        events = []
        event_bus.subscribe("test-crawl", lambda e: events.append(e))

        await emit_state_change("test-crawl", "QUEUED", "INITIALIZING")

        assert len(events) == 1
        assert events[0].event_type == EventType.STATE_CHANGE
        assert events[0].data["from_state"] == "QUEUED"

        # Cleanup
        event_bus.cleanup_crawl("test-crawl")

    async def test_emit_progress_update(self):
        """Test progress update emission."""
        from events.event_bus import event_bus

        events = []
        event_bus.subscribe("test-crawl", lambda e: events.append(e))

        await emit_progress_update("test-crawl", {"percentage": 50.0})

        assert len(events) == 1
        assert events[0].event_type == EventType.PROGRESS_UPDATE

        # Cleanup
        event_bus.cleanup_crawl("test-crawl")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
