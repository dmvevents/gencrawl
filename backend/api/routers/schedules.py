"""Schedules Router - Schedule Management Endpoints."""

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from typing import Optional, List
from datetime import datetime
import os
import sys

# Add parent directory to path for imports
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, backend_dir)

from models.crawl_schedule import (
    CrawlSchedule,
    ScheduleType,
    ScheduleStatus,
    ScheduleCreateRequest,
    ScheduleUpdateRequest,
    ScheduleListResponse,
    ScheduleRunRecord,
    NextRunsResponse,
)
from utils.scheduler import crawl_scheduler

router = APIRouter()


@router.get("/schedules", response_model=ScheduleListResponse)
async def list_schedules(
    status: Optional[str] = Query(None, description="Filter by status: active, paused, completed"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
):
    """List all schedules with optional filtering."""
    schedules = crawl_scheduler.get_all_schedules()

    # Apply filters
    if status:
        try:
            status_filter = ScheduleStatus(status.lower())
            schedules = [s for s in schedules if s.status == status_filter]
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid status: {status}")

    if user_id:
        schedules = [s for s in schedules if s.user_id == user_id]

    # Sort by next run
    schedules.sort(key=lambda s: s.next_run or datetime.max, reverse=False)

    active_count = len([s for s in schedules if s.status == ScheduleStatus.ACTIVE])
    paused_count = len([s for s in schedules if s.status == ScheduleStatus.PAUSED])

    return ScheduleListResponse(
        schedules=schedules,
        total=len(schedules),
        active_count=active_count,
        paused_count=paused_count,
    )


@router.get("/schedules/stats")
async def get_schedule_stats():
    """Get scheduler statistics."""
    stats = crawl_scheduler.get_stats()
    return stats


@router.get("/schedules/upcoming")
async def get_upcoming_schedules(
    limit: int = Query(10, ge=1, le=50, description="Number of schedules to return")
):
    """Get schedules with upcoming runs, sorted by next run time."""
    schedules = crawl_scheduler.get_active_schedules()

    # Filter to only those with next_run set
    upcoming = [s for s in schedules if s.next_run]

    # Sort by next run
    upcoming.sort(key=lambda s: s.next_run or datetime.max)

    return {
        "schedules": upcoming[:limit],
        "total": len(upcoming),
    }


@router.get("/schedules/{schedule_id}")
async def get_schedule(schedule_id: str):
    """Get a specific schedule by ID."""
    schedule = crawl_scheduler.get_schedule(schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail=f"Schedule {schedule_id} not found")
    return schedule


@router.get("/schedules/{schedule_id}/next-runs", response_model=NextRunsResponse)
async def get_next_runs(
    schedule_id: str,
    count: int = Query(5, ge=1, le=20, description="Number of future runs to show")
):
    """Get the next N scheduled run times for a schedule."""
    schedule = crawl_scheduler.get_schedule(schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail=f"Schedule {schedule_id} not found")

    next_runs = crawl_scheduler.get_next_runs(schedule_id, count)

    return NextRunsResponse(
        schedule_id=schedule_id,
        next_runs=next_runs,
        timezone=schedule.timezone,
    )


@router.get("/schedules/{schedule_id}/history")
async def get_schedule_history(
    schedule_id: str,
    limit: int = Query(20, ge=1, le=100, description="Number of records to return")
):
    """Get run history for a schedule."""
    schedule = crawl_scheduler.get_schedule(schedule_id)
    if not schedule:
        raise HTTPException(status_code=404, detail=f"Schedule {schedule_id} not found")

    history = crawl_scheduler.get_schedule_history(schedule_id, limit)

    # Calculate stats
    total_runs = len(history)
    successful = len([r for r in history if r.status in ["completed", "started"]])
    failed = len([r for r in history if r.status == "failed"])

    return {
        "schedule_id": schedule_id,
        "schedule_name": schedule.name,
        "history": [r.dict() for r in history],
        "total_runs": total_runs,
        "successful_runs": successful,
        "failed_runs": failed,
        "success_rate": (successful / total_runs * 100) if total_runs > 0 else 0,
    }


@router.post("/schedules", response_model=CrawlSchedule)
async def create_schedule(request: ScheduleCreateRequest):
    """Create a new schedule."""
    # Validate that either template_id or crawl_config is provided
    if not request.template_id and not request.crawl_config:
        raise HTTPException(
            status_code=400,
            detail="Either template_id or crawl_config must be provided"
        )

    schedule = crawl_scheduler.create_schedule(request)
    return schedule


@router.put("/schedules/{schedule_id}", response_model=CrawlSchedule)
async def update_schedule(schedule_id: str, request: ScheduleUpdateRequest):
    """Update an existing schedule."""
    existing = crawl_scheduler.get_schedule(schedule_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Schedule {schedule_id} not found")

    schedule = crawl_scheduler.update_schedule(schedule_id, request)
    if not schedule:
        raise HTTPException(status_code=500, detail="Failed to update schedule")

    return schedule


@router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str):
    """Delete a schedule."""
    existing = crawl_scheduler.get_schedule(schedule_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Schedule {schedule_id} not found")

    success = crawl_scheduler.delete_schedule(schedule_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete schedule")

    return {
        "schedule_id": schedule_id,
        "deleted": True,
        "message": "Schedule deleted successfully"
    }


@router.post("/schedules/{schedule_id}/pause")
async def pause_schedule(schedule_id: str):
    """Pause a schedule."""
    existing = crawl_scheduler.get_schedule(schedule_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Schedule {schedule_id} not found")

    if existing.status != ScheduleStatus.ACTIVE:
        raise HTTPException(
            status_code=400,
            detail=f"Schedule is not active (current status: {existing.status.value})"
        )

    schedule = crawl_scheduler.pause_schedule(schedule_id)
    if not schedule:
        raise HTTPException(status_code=500, detail="Failed to pause schedule")

    return {
        "schedule_id": schedule_id,
        "status": schedule.status.value,
        "message": "Schedule paused successfully"
    }


@router.post("/schedules/{schedule_id}/resume")
async def resume_schedule(schedule_id: str):
    """Resume a paused schedule."""
    existing = crawl_scheduler.get_schedule(schedule_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Schedule {schedule_id} not found")

    if existing.status != ScheduleStatus.PAUSED:
        raise HTTPException(
            status_code=400,
            detail=f"Schedule is not paused (current status: {existing.status.value})"
        )

    schedule = crawl_scheduler.resume_schedule(schedule_id)
    if not schedule:
        raise HTTPException(status_code=500, detail="Failed to resume schedule")

    return {
        "schedule_id": schedule_id,
        "status": schedule.status.value,
        "next_run": schedule.next_run.isoformat() if schedule.next_run else None,
        "message": "Schedule resumed successfully"
    }


@router.post("/schedules/{schedule_id}/trigger")
async def trigger_schedule(schedule_id: str, background_tasks: BackgroundTasks):
    """Manually trigger a schedule to run now."""
    existing = crawl_scheduler.get_schedule(schedule_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Schedule {schedule_id} not found")

    # Run in background
    async def run_trigger():
        await crawl_scheduler.trigger_schedule(schedule_id)

    background_tasks.add_task(run_trigger)

    return {
        "schedule_id": schedule_id,
        "triggered": True,
        "message": "Schedule triggered - crawl will start shortly"
    }


@router.post("/scheduler/start")
async def start_scheduler():
    """Start the scheduler (if not already running)."""
    success = crawl_scheduler.start()
    return {
        "started": success,
        "running": crawl_scheduler._is_running,
        "message": "Scheduler started" if success else "Scheduler could not be started"
    }


@router.post("/scheduler/stop")
async def stop_scheduler():
    """Stop the scheduler."""
    crawl_scheduler.stop()
    return {
        "stopped": True,
        "running": crawl_scheduler._is_running,
        "message": "Scheduler stopped"
    }


@router.get("/scheduler/status")
async def get_scheduler_status():
    """Get the current scheduler status."""
    stats = crawl_scheduler.get_stats()
    return {
        "running": crawl_scheduler._is_running,
        **stats
    }
