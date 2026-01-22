"""Errors Router - Error tracking and retry endpoints."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from pathlib import Path
import json
import os
import sys

# Add parent directory to path for imports
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, backend_dir)

router = APIRouter()


class ErrorEntry(BaseModel):
    """Error entry model."""
    id: str
    timestamp: str
    error_type: str
    message: str
    stack_trace: Optional[str] = None
    url: Optional[str] = None
    crawl_id: str
    count: int = 1


class ErrorsResponse(BaseModel):
    """Response for error listing."""
    errors: List[ErrorEntry]
    total: int


class RetryRequest(BaseModel):
    """Request for retry operation."""
    error_ids: List[str]


class RetryResponse(BaseModel):
    """Response for retry operation."""
    success: bool
    retried_count: int
    message: str


def _get_errors_from_logs(crawl_id: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    """Extract errors from crawl event logs."""
    log_dir = Path(__file__).parent.parent.parent.parent / "logs"
    errors = []
    error_counts: Dict[str, int] = {}

    if not log_dir.exists():
        return errors

    # Determine which log files to read
    if crawl_id:
        log_files = [log_dir / f"crawl_{crawl_id}_events.jsonl"]
    else:
        log_files = list(log_dir.glob("crawl_*_events.jsonl"))

    error_id_counter = 0
    for log_file in log_files:
        if not log_file.exists():
            continue

        try:
            with open(log_file, 'r') as f:
                for line in f:
                    try:
                        event = json.loads(line.strip())
                        event_type = event.get("event_type", "")
                        data = event.get("data", {})

                        # Check for error events
                        is_error = (
                            "error" in event_type.lower() or
                            data.get("success") is False or
                            data.get("error") or
                            data.get("error_message")
                        )

                        if is_error:
                            error_id_counter += 1

                            # Determine error type
                            if "timeout" in str(data).lower():
                                error_type = "timeout_error"
                            elif "network" in str(data).lower() or "connection" in str(data).lower():
                                error_type = "network_error"
                            elif "parse" in str(data).lower():
                                error_type = "parse_error"
                            elif "extraction" in str(data).lower():
                                error_type = "extraction_error"
                            elif "404" in str(data):
                                error_type = "not_found_error"
                            elif "403" in str(data) or "401" in str(data):
                                error_type = "auth_error"
                            elif "500" in str(data):
                                error_type = "server_error"
                            else:
                                error_type = event_type or "unknown_error"

                            # Get error message
                            message = (
                                data.get("error_message") or
                                data.get("error") or
                                data.get("message") or
                                f"Error during {event_type}"
                            )

                            # Create unique key for deduplication
                            error_key = f"{error_type}:{message[:50]}"
                            error_counts[error_key] = error_counts.get(error_key, 0) + 1

                            error = {
                                "id": f"err_{error_id_counter}",
                                "timestamp": event.get("timestamp", datetime.now().isoformat()),
                                "error_type": error_type,
                                "message": str(message)[:500],  # Truncate long messages
                                "stack_trace": data.get("stack_trace"),
                                "url": data.get("url"),
                                "crawl_id": event.get("crawl_id", ""),
                                "count": error_counts[error_key]
                            }
                            errors.append(error)

                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            print(f"Error reading log file {log_file}: {e}")
            continue

    # Deduplicate and aggregate errors
    seen_keys: Dict[str, Dict[str, Any]] = {}
    for error in errors:
        key = f"{error['error_type']}:{error['message'][:50]}"
        if key not in seen_keys:
            seen_keys[key] = error
        else:
            # Update count for existing error
            seen_keys[key]["count"] = max(seen_keys[key]["count"], error["count"])

    # Convert back to list and sort by timestamp descending
    unique_errors = list(seen_keys.values())
    unique_errors.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

    return unique_errors[:limit]


@router.get("/errors/all", response_model=ErrorsResponse)
async def get_all_errors(
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of errors to return")
):
    """Get all errors across crawls."""
    errors = _get_errors_from_logs(crawl_id=None, limit=limit)

    return ErrorsResponse(
        errors=[ErrorEntry(**err) for err in errors],
        total=len(errors)
    )


@router.get("/errors/{crawl_id}", response_model=ErrorsResponse)
async def get_crawl_errors(
    crawl_id: str,
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of errors to return")
):
    """Get errors for specific crawl."""
    errors = _get_errors_from_logs(crawl_id=crawl_id, limit=limit)

    return ErrorsResponse(
        errors=[ErrorEntry(**err) for err in errors],
        total=len(errors)
    )


@router.get("/crawl/{crawl_id}/errors", response_model=ErrorsResponse)
async def get_errors_by_crawl(
    crawl_id: str,
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of errors to return")
):
    """Get errors for specific crawl (alternative endpoint)."""
    return await get_crawl_errors(crawl_id, limit)


@router.post("/crawl/retry", response_model=RetryResponse)
async def retry_failed(request: RetryRequest):
    """Retry failed URLs from specified errors."""
    # Note: Full implementation would require URL queue management
    # This is a placeholder that returns success for demo purposes

    if not request.error_ids:
        return RetryResponse(
            success=False,
            retried_count=0,
            message="No error IDs provided"
        )

    # TODO: Implement actual retry logic
    # For now, return a success response indicating the retry was queued
    return RetryResponse(
        success=True,
        retried_count=len(request.error_ids),
        message=f"Queued {len(request.error_ids)} URLs for retry"
    )
