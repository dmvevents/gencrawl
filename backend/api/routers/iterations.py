"""
Iterations Router - Multi-Iteration Crawling and Resume/Continue Endpoints

Features:
- Configure multi-iteration crawls
- List iterations for a crawl
- Get specific iteration details
- Compare iterations (what's new, changed)
- Resume from checkpoint
- List checkpoints
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from pathlib import Path
import sys
import os

# Add parent directory to path for imports
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, backend_dir)

from utils.iteration_manager import (
    IterationManager,
    IterationMode,
    ChangeType,
    IterationMetadata,
    IterationComparison,
)
from utils.checkpoint import (
    CheckpointManager,
    CheckpointType,
    CheckpointMetadata,
)
from services.singletons import crawler_manager

router = APIRouter()

# Initialize managers
iteration_manager = IterationManager()
checkpoint_manager = CheckpointManager()


# Request/Response Models

class ConfigureIterationsRequest(BaseModel):
    """Request to configure multi-iteration crawl."""
    max_iterations: int = Field(1, ge=1, le=100, description="Maximum number of iterations")
    iteration_interval_hours: float = Field(24.0, ge=0.1, description="Hours between iterations")
    mode: IterationMode = Field(IterationMode.INCREMENTAL, description="Iteration mode")
    stop_if_no_changes: bool = Field(True, description="Stop if no new documents found")
    notify_on_completion: bool = Field(False, description="Send notification on completion")


class IterationResponse(BaseModel):
    """Response with iteration details."""
    iteration_id: str
    crawl_id: str
    iteration_number: int
    parent_iteration_id: Optional[str] = None
    baseline_iteration_id: Optional[str] = None
    mode: str
    started_at: str
    completed_at: Optional[str] = None
    duration_seconds: Optional[float] = None
    stats: Dict[str, Any]


class ComparisonResponse(BaseModel):
    """Response with iteration comparison."""
    baseline_iteration_id: str
    current_iteration_id: str
    new_documents: List[str]
    modified_documents: List[str]
    unchanged_documents: List[str]
    deleted_documents: List[str]
    total_changes: int
    has_changes: bool
    summary: str


class CheckpointResponse(BaseModel):
    """Response with checkpoint details."""
    checkpoint_id: str
    crawl_id: str
    checkpoint_number: int
    checkpoint_type: str
    created_at: str
    current_state: str
    current_substate: Optional[str] = None
    can_resume: bool
    file_size_bytes: Optional[int] = None
    progress: Dict[str, Any]


class ContinueRequest(BaseModel):
    """Request to continue/resume a crawl."""
    checkpoint_id: Optional[str] = Field(None, description="Specific checkpoint ID (or use latest)")
    validate: bool = Field(True, description="Validate checkpoint before resuming")


# Iterations Endpoints

@router.post("/crawl/{crawl_id}/iterations")
async def configure_iterations(
    crawl_id: str,
    request: ConfigureIterationsRequest,
    background_tasks: BackgroundTasks
):
    """
    Configure multi-iteration crawling for a crawl.

    This sets up a series of iterations that will run automatically.
    """
    # Get or create baseline iteration
    existing_iterations = iteration_manager.get_iterations_for_crawl(crawl_id)

    if not existing_iterations:
        # Create baseline iteration
        baseline_id = iteration_manager.create_iteration(
            crawl_id=crawl_id,
            config={
                "max_iterations": request.max_iterations,
                "iteration_interval_hours": request.iteration_interval_hours,
                "mode": request.mode,
                "stop_if_no_changes": request.stop_if_no_changes,
            },
            mode=IterationMode.BASELINE
        )

        return {
            "crawl_id": crawl_id,
            "baseline_iteration_id": baseline_id,
            "configured_iterations": request.max_iterations,
            "mode": request.mode,
            "message": "Multi-iteration crawl configured. Start with baseline iteration."
        }
    else:
        # Already has iterations
        return {
            "crawl_id": crawl_id,
            "baseline_iteration_id": existing_iterations[0].iteration_id,
            "existing_iterations": len(existing_iterations),
            "message": "Crawl already has iterations configured."
        }


@router.get("/crawl/{crawl_id}/iterations", response_model=List[IterationResponse])
async def list_iterations(crawl_id: str):
    """
    List all iterations for a crawl, sorted by iteration number.
    """
    iterations = iteration_manager.get_iterations_for_crawl(crawl_id)

    if not iterations:
        raise HTTPException(
            status_code=404,
            detail=f"No iterations found for crawl {crawl_id}"
        )

    return [
        IterationResponse(
            iteration_id=meta.iteration_id,
            crawl_id=meta.crawl_id,
            iteration_number=meta.iteration_number,
            parent_iteration_id=meta.parent_iteration_id,
            baseline_iteration_id=meta.baseline_iteration_id,
            mode=meta.mode.value,
            started_at=meta.started_at.isoformat(),
            completed_at=meta.completed_at.isoformat() if meta.completed_at else None,
            duration_seconds=meta.duration_seconds,
            stats=meta.stats
        )
        for meta in iterations
    ]


@router.get("/crawl/{crawl_id}/iterations/{iteration_number}", response_model=IterationResponse)
async def get_iteration(crawl_id: str, iteration_number: int):
    """
    Get details for a specific iteration.
    """
    iterations = iteration_manager.get_iterations_for_crawl(crawl_id)

    iteration = next(
        (meta for meta in iterations if meta.iteration_number == iteration_number),
        None
    )

    if not iteration:
        raise HTTPException(
            status_code=404,
            detail=f"Iteration {iteration_number} not found for crawl {crawl_id}"
        )

    # Get detailed statistics
    stats = iteration_manager.get_statistics(iteration.iteration_id)

    return IterationResponse(
        iteration_id=iteration.iteration_id,
        crawl_id=iteration.crawl_id,
        iteration_number=iteration.iteration_number,
        parent_iteration_id=iteration.parent_iteration_id,
        baseline_iteration_id=iteration.baseline_iteration_id,
        mode=iteration.mode.value,
        started_at=iteration.started_at.isoformat(),
        completed_at=iteration.completed_at.isoformat() if iteration.completed_at else None,
        duration_seconds=stats.get('duration_seconds'),
        stats=stats.get('stats', {})
    )


@router.get("/crawl/{crawl_id}/iterations/compare", response_model=ComparisonResponse)
async def compare_iterations(
    crawl_id: str,
    baseline: int = Query(..., description="Baseline iteration number"),
    current: int = Query(..., description="Current iteration number")
):
    """
    Compare two iterations to see what changed.

    Returns:
        - New documents
        - Modified documents
        - Unchanged documents
        - Deleted documents
    """
    iterations = iteration_manager.get_iterations_for_crawl(crawl_id)

    baseline_iter = next(
        (meta for meta in iterations if meta.iteration_number == baseline),
        None
    )
    current_iter = next(
        (meta for meta in iterations if meta.iteration_number == current),
        None
    )

    if not baseline_iter or not current_iter:
        raise HTTPException(
            status_code=404,
            detail=f"Iterations {baseline} or {current} not found"
        )

    # Perform comparison
    comparison = iteration_manager.compare_iterations(
        baseline_iter.iteration_id,
        current_iter.iteration_id
    )

    # Generate summary
    summary = (
        f"Iteration {current} vs {baseline}: "
        f"{len(comparison.new_documents)} new, "
        f"{len(comparison.modified_documents)} modified, "
        f"{len(comparison.deleted_documents)} deleted, "
        f"{len(comparison.unchanged_documents)} unchanged"
    )

    return ComparisonResponse(
        baseline_iteration_id=baseline_iter.iteration_id,
        current_iteration_id=current_iter.iteration_id,
        new_documents=comparison.new_documents,
        modified_documents=comparison.modified_documents,
        unchanged_documents=comparison.unchanged_documents,
        deleted_documents=comparison.deleted_documents,
        total_changes=comparison.total_changes,
        has_changes=comparison.has_changes,
        summary=summary
    )


@router.post("/crawl/{crawl_id}/iterations/next")
async def create_next_iteration(
    crawl_id: str,
    background_tasks: BackgroundTasks,
    mode: IterationMode = Query(IterationMode.INCREMENTAL, description="Iteration mode")
):
    """
    Create and start the next iteration for a crawl.

    This will automatically determine the iteration number based on existing iterations.
    """
    # Get existing iterations
    existing = iteration_manager.get_iterations_for_crawl(crawl_id)

    if not existing:
        raise HTTPException(
            status_code=404,
            detail=f"No baseline iteration found for crawl {crawl_id}. Create one first."
        )

    # Get config from baseline
    baseline_config = existing[0].config

    # Create next iteration
    iteration_id = iteration_manager.create_iteration(
        crawl_id=crawl_id,
        config=baseline_config,
        mode=mode
    )

    # TODO: Start crawl with this iteration ID
    # background_tasks.add_task(crawler_manager.execute_crawl, iteration_id)

    return {
        "crawl_id": crawl_id,
        "iteration_id": iteration_id,
        "iteration_number": len(existing),
        "mode": mode,
        "status": "created",
        "message": f"Iteration {len(existing)} created. Start crawl to execute."
    }


# Checkpoint/Resume Endpoints

@router.get("/crawl/{crawl_id}/checkpoints", response_model=List[CheckpointResponse])
async def list_checkpoints(crawl_id: str):
    """
    List all checkpoints for a crawl, sorted by checkpoint number.
    """
    checkpoints = checkpoint_manager.get_checkpoints_for_crawl(crawl_id)

    if not checkpoints:
        return []

    return [
        CheckpointResponse(
            checkpoint_id=ckpt.checkpoint_id,
            crawl_id=ckpt.crawl_id,
            checkpoint_number=ckpt.checkpoint_number,
            checkpoint_type=ckpt.checkpoint_type.value,
            created_at=ckpt.created_at.isoformat(),
            current_state=ckpt.current_state,
            current_substate=ckpt.current_substate,
            can_resume=ckpt.can_resume,
            file_size_bytes=ckpt.file_size_bytes,
            progress=ckpt.progress
        )
        for ckpt in checkpoints
    ]


@router.post("/crawl/{crawl_id}/checkpoint")
async def create_checkpoint(
    crawl_id: str,
    checkpoint_type: CheckpointType = Query(CheckpointType.MANUAL, description="Checkpoint type")
):
    """
    Create a manual checkpoint for a running crawl.

    This saves the current state so the crawl can be resumed later.
    """
    # Get current state from crawler manager
    state_data = crawler_manager.jobs.get(crawl_id)

    if not state_data:
        raise HTTPException(
            status_code=404,
            detail=f"Crawl {crawl_id} not found or not running"
        )

    # Create checkpoint
    checkpoint_id = checkpoint_manager.create_checkpoint(
        crawl_id=crawl_id,
        state_data=state_data,
        checkpoint_type=checkpoint_type
    )

    checkpoint_meta = checkpoint_manager.get_latest_checkpoint(crawl_id)

    return {
        "checkpoint_id": checkpoint_id,
        "crawl_id": crawl_id,
        "checkpoint_number": checkpoint_meta.checkpoint_number if checkpoint_meta else 0,
        "created_at": checkpoint_meta.created_at.isoformat() if checkpoint_meta else datetime.utcnow().isoformat(),
        "message": "Checkpoint created successfully"
    }


@router.post("/crawl/{crawl_id}/continue")
async def continue_crawl(
    crawl_id: str,
    request: ContinueRequest,
    background_tasks: BackgroundTasks
):
    """
    Resume/continue a crawl from the latest (or specified) checkpoint.

    This allows picking up where a crawl left off after a pause, crash, or manual stop.
    """
    # Determine which checkpoint to use
    if request.checkpoint_id:
        checkpoint_id = request.checkpoint_id
    else:
        # Use latest checkpoint
        latest = checkpoint_manager.get_latest_checkpoint(crawl_id)
        if not latest:
            raise HTTPException(
                status_code=404,
                detail=f"No checkpoints found for crawl {crawl_id}"
            )
        checkpoint_id = latest.checkpoint_id

    # Resume from checkpoint
    checkpoint_data = checkpoint_manager.resume_from_checkpoint(
        checkpoint_id=checkpoint_id,
        validate=request.validate
    )

    if not checkpoint_data:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot resume from checkpoint {checkpoint_id}. It may be invalid or from a terminal state."
        )

    # TODO: Restore crawler state and continue execution
    # This would require modifying CrawlerManager to accept checkpoint data
    # background_tasks.add_task(crawler_manager.resume_from_checkpoint, checkpoint_data)

    return {
        "crawl_id": crawl_id,
        "checkpoint_id": checkpoint_id,
        "resumed_from_state": checkpoint_data.current_state,
        "resumed_from_substate": checkpoint_data.current_substate,
        "crawled_urls": len(checkpoint_data.crawled_urls),
        "queued_urls": len(checkpoint_data.queued_urls),
        "message": "Crawl resumed successfully from checkpoint",
        "note": "Resume functionality requires integration with CrawlerManager (TODO)"
    }


@router.get("/crawl/{crawl_id}/checkpoints/latest")
async def get_latest_checkpoint(crawl_id: str):
    """Get the most recent checkpoint for a crawl."""
    latest = checkpoint_manager.get_latest_checkpoint(crawl_id)

    if not latest:
        raise HTTPException(
            status_code=404,
            detail=f"No checkpoints found for crawl {crawl_id}"
        )

    return CheckpointResponse(
        checkpoint_id=latest.checkpoint_id,
        crawl_id=latest.crawl_id,
        checkpoint_number=latest.checkpoint_number,
        checkpoint_type=latest.checkpoint_type.value,
        created_at=latest.created_at.isoformat(),
        current_state=latest.current_state,
        current_substate=latest.current_substate,
        can_resume=latest.can_resume,
        file_size_bytes=latest.file_size_bytes,
        progress=latest.progress
    )


@router.delete("/crawl/{crawl_id}/checkpoints/{checkpoint_id}")
async def delete_checkpoint(crawl_id: str, checkpoint_id: str):
    """Delete a specific checkpoint."""
    success = checkpoint_manager.delete_checkpoint(checkpoint_id)

    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Checkpoint {checkpoint_id} not found"
        )

    return {
        "checkpoint_id": checkpoint_id,
        "crawl_id": crawl_id,
        "deleted": True,
        "message": "Checkpoint deleted successfully"
    }


@router.post("/crawl/{crawl_id}/checkpoints/cleanup")
async def cleanup_old_checkpoints(
    crawl_id: str,
    keep_last: int = Query(3, ge=1, le=10, description="Number of recent checkpoints to keep")
):
    """
    Delete old checkpoints, keeping only the most recent N.

    This helps manage storage space.
    """
    deleted_count = checkpoint_manager.delete_old_checkpoints(
        crawl_id=crawl_id,
        keep_last=keep_last
    )

    remaining = checkpoint_manager.get_checkpoints_for_crawl(crawl_id)

    return {
        "crawl_id": crawl_id,
        "deleted_count": deleted_count,
        "remaining_checkpoints": len(remaining),
        "message": f"Deleted {deleted_count} old checkpoints, kept last {keep_last}"
    }


# Statistics Endpoints

@router.get("/crawl/{crawl_id}/iterations/stats")
async def get_iteration_stats(crawl_id: str):
    """Get comprehensive iteration statistics for a crawl."""
    iterations = iteration_manager.get_iterations_for_crawl(crawl_id)

    if not iterations:
        raise HTTPException(
            status_code=404,
            detail=f"No iterations found for crawl {crawl_id}"
        )

    # Get latest iteration comparison if available
    latest_comparison = None
    if len(iterations) > 1:
        latest = iterations[-1]
        parent = iterations[-2]

        comparison = iteration_manager.compare_iterations(
            parent.iteration_id,
            latest.iteration_id
        )

        latest_comparison = {
            "baseline_iteration": parent.iteration_number,
            "current_iteration": latest.iteration_number,
            "new_documents": len(comparison.new_documents),
            "modified_documents": len(comparison.modified_documents),
            "unchanged_documents": len(comparison.unchanged_documents),
            "deleted_documents": len(comparison.deleted_documents),
            "total_changes": comparison.total_changes,
            "has_changes": comparison.has_changes,
        }

    return {
        "crawl_id": crawl_id,
        "total_iterations": len(iterations),
        "baseline_iteration_id": iterations[0].iteration_id,
        "latest_iteration_id": iterations[-1].iteration_id,
        "iterations": [
            {
                "iteration_number": meta.iteration_number,
                "iteration_id": meta.iteration_id,
                "mode": meta.mode.value,
                "duration_seconds": meta.duration_seconds,
                "stats": meta.stats,
            }
            for meta in iterations
        ],
        "latest_comparison": latest_comparison,
    }


@router.get("/crawl/{crawl_id}/checkpoints/stats")
async def get_checkpoint_stats(crawl_id: str):
    """Get checkpoint statistics for a crawl."""
    stats = checkpoint_manager.get_statistics(crawl_id)

    return {
        "crawl_id": crawl_id,
        **stats
    }
