"""Enhanced Monitoring Routes with State Machine and Real-time Updates."""

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
import json
from typing import Optional
from datetime import datetime

from services.singletons import crawler_manager
from utils.paths import get_log_dir

router = APIRouter()

LOG_DIR = get_log_dir()

@router.get("/logs/{crawl_id}")
async def get_crawl_logs(crawl_id: str, limit: int = 100):
    """Get crawl event logs."""
    log_file = LOG_DIR / f"crawl_{crawl_id}_events.jsonl"

    if not log_file.exists():
        raise HTTPException(status_code=404, detail="Log file not found")

    events = []
    with open(log_file, 'r') as f:
        for line in f:
            events.append(json.loads(line))

    # Return most recent events
    return {
        "crawl_id": crawl_id,
        "total_events": len(events),
        "events": events[-limit:] if limit else events
    }


@router.get("/logs/{crawl_id}/stats")
async def get_crawl_stats(crawl_id: str):
    """Get crawl statistics."""
    log_file = LOG_DIR / f"crawl_{crawl_id}_events.jsonl"

    if not log_file.exists():
        return {
            "crawl_id": crawl_id,
            "stats": {
                "total_pages": 0,
                "successful_pages": 0,
                "failed_pages": 0,
                "documents_found": 0
            }
        }

    stats = {
        "total_pages": 0,
        "successful_pages": 0,
        "failed_pages": 0,
        "documents_found": 0,
        "extractions_successful": 0,
        "extractions_failed": 0,
        "quality_passed": 0,
        "quality_failed": 0,
        "errors": 0
    }

    with open(log_file, 'r') as f:
        for line in f:
            event = json.loads(line)
            event_type = event["event_type"]

            if event_type == "page_crawled":
                stats["total_pages"] += 1
                if event["data"]["success"]:
                    stats["successful_pages"] += 1
                else:
                    stats["failed_pages"] += 1

            elif event_type == "document_found":
                stats["documents_found"] += 1

            elif event_type == "extraction":
                if event["data"]["success"]:
                    stats["extractions_successful"] += 1
                else:
                    stats["extractions_failed"] += 1

            elif event_type == "quality_check":
                if event["data"]["passed"]:
                    stats["quality_passed"] += 1
                else:
                    stats["quality_failed"] += 1

            elif event_type == "error":
                stats["errors"] += 1

    return {
        "crawl_id": crawl_id,
        "stats": stats
    }


@router.get("/logs/all")
async def list_all_crawl_logs():
    """List all crawl logs."""
    if not LOG_DIR.exists():
        return {"crawls": []}

    crawl_logs = []
    for log_file in LOG_DIR.glob("crawl_*_events.jsonl"):
        crawl_id = log_file.stem.replace("crawl_", "").replace("_events", "")

        # Get first and last event
        with open(log_file, 'r') as f:
            lines = f.readlines()
            if lines:
                first_event = json.loads(lines[0])
                last_event = json.loads(lines[-1])

                crawl_logs.append({
                    "crawl_id": crawl_id,
                    "started": first_event["timestamp"],
                    "last_updated": last_event["timestamp"],
                    "total_events": len(lines)
                })

    return {"crawls": crawl_logs}


# New State Machine Endpoints
@router.get("/crawl/{crawl_id}/state")
async def get_crawl_state(crawl_id: str):
    """Get current state and substates for a crawl."""
    state = crawler_manager.get_state(crawl_id)

    if not state:
        raise HTTPException(status_code=404, detail="Crawl not found")

    return state


@router.get("/crawl/{crawl_id}/metrics")
async def get_crawl_metrics(
    crawl_id: str,
    window_seconds: int = 300,
    aggregated: bool = False
):
    """Get real-time metrics for a crawl."""
    metrics_collector = crawler_manager.metrics_aggregator.collectors.get(crawl_id)

    if not metrics_collector:
        raise HTTPException(status_code=404, detail="Metrics not found")

    if aggregated:
        return metrics_collector.get_aggregated_metrics(window_seconds)
    else:
        return metrics_collector.get_snapshot()


@router.get("/crawl/{crawl_id}/metrics/time-series")
async def get_metrics_time_series(
    crawl_id: str,
    metric_name: str,
    window_seconds: int = 300,
    limit: int = 100
):
    """Get time series data for a specific metric."""
    metrics_collector = crawler_manager.metrics_aggregator.collectors.get(crawl_id)

    if not metrics_collector:
        raise HTTPException(status_code=404, detail="Metrics not found")

    return metrics_collector.get_time_series(metric_name, window_seconds, limit)


@router.get("/crawl/{crawl_id}/events")
async def get_crawl_events(
    crawl_id: str,
    limit: int = 100,
    event_type: Optional[str] = None,
    since: Optional[str] = None
):
    """Get event stream for a crawl."""
    from events.event_bus import event_bus, EventType

    if since:
        timestamp = datetime.fromisoformat(since)
        events = event_bus.get_events_since(crawl_id, timestamp)
    elif event_type:
        try:
            event_type_enum = EventType(event_type)
            events = event_bus.get_events_by_type(crawl_id, event_type_enum, limit)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid event type: {event_type}")
    else:
        events = event_bus.get_history(crawl_id, limit)

    return {
        "crawl_id": crawl_id,
        "event_count": len(events),
        "events": [
            {
                "event_id": e.event_id,
                "event_type": e.event_type,
                "timestamp": e.timestamp.isoformat(),
                "data": e.data,
                "metadata": e.metadata,
            }
            for e in events
        ]
    }


@router.post("/crawl/{crawl_id}/pause")
async def pause_crawl(crawl_id: str):
    """Pause a running crawl."""
    try:
        success = await crawler_manager.pause_crawl(crawl_id)

        if not success:
            raise HTTPException(
                status_code=400,
                detail="Crawl cannot be paused in its current state"
            )

        return {
            "crawl_id": crawl_id,
            "status": "paused",
            "message": "Crawl paused successfully"
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/crawl/{crawl_id}/resume")
async def resume_crawl(crawl_id: str):
    """Resume a paused crawl."""
    try:
        success = await crawler_manager.resume_crawl(crawl_id)

        if not success:
            raise HTTPException(
                status_code=400,
                detail="Crawl cannot be resumed in its current state"
            )

        return {
            "crawl_id": crawl_id,
            "status": "resumed",
            "message": "Crawl resumed successfully"
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/crawl/{crawl_id}/cancel")
async def cancel_crawl(crawl_id: str):
    """Cancel a crawl job."""
    try:
        success = await crawler_manager.cancel_crawl(crawl_id)

        if not success:
            raise HTTPException(
                status_code=400,
                detail="Crawl is already in a terminal state"
            )

        return {
            "crawl_id": crawl_id,
            "status": "cancelled",
            "message": "Crawl cancelled successfully"
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/crawl/{crawl_id}/status")
async def get_crawl_status(crawl_id: str):
    """Get comprehensive crawl status."""
    status = crawler_manager.get_status(crawl_id)

    if not status:
        raise HTTPException(status_code=404, detail="Crawl not found")

    return status


@router.get("/crawl/{crawl_id}/performance")
async def get_performance_summary(crawl_id: str):
    """Get performance summary with key metrics."""
    metrics_collector = crawler_manager.metrics_aggregator.collectors.get(crawl_id)

    if not metrics_collector:
        raise HTTPException(status_code=404, detail="Metrics not found")

    return metrics_collector.get_performance_summary()


@router.websocket("/crawl/{crawl_id}/ws")
async def websocket_endpoint(websocket: WebSocket, crawl_id: str):
    """WebSocket endpoint for real-time crawl updates."""
    from events.event_bus import event_bus

    await websocket.accept()

    # Add WebSocket to event bus
    event_bus.add_websocket(crawl_id, websocket)

    try:
        # Keep connection alive and handle incoming messages
        while True:
            # Wait for messages from client (optional)
            data = await websocket.receive_text()

            # Handle commands if needed
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        # Remove WebSocket from event bus
        event_bus.remove_websocket(crawl_id, websocket)


@router.get("/system/metrics")
async def get_system_metrics():
    """Get system-wide metrics summary."""
    return crawler_manager.metrics_aggregator.get_system_summary()


@router.get("/crawl/{crawl_id}/estimate")
async def get_completion_estimate(crawl_id: str):
    """Get estimated completion time for a crawl."""
    state_data = crawler_manager.jobs.get(crawl_id)

    if not state_data:
        raise HTTPException(status_code=404, detail="Crawl not found")

    metrics_collector = crawler_manager.metrics_aggregator.collectors.get(crawl_id)

    if not metrics_collector or not state_data.started_at:
        return {
            "crawl_id": crawl_id,
            "estimated_completion": None,
            "message": "Insufficient data for estimation"
        }

    # Calculate completion estimate based on progress
    total_items = sum(p.total for p in state_data.progress.values())
    completed_items = sum(p.completed for p in state_data.progress.values())

    estimated_completion = metrics_collector.estimate_completion(
        total_items,
        completed_items,
        state_data.started_at
    )

    return {
        "crawl_id": crawl_id,
        "estimated_completion": estimated_completion.isoformat() if estimated_completion else None,
        "progress_percentage": state_data.overall_progress_percentage,
        "total_items": total_items,
        "completed_items": completed_items,
        "remaining_items": total_items - completed_items,
    }
