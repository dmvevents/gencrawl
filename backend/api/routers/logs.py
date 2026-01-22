"""Logs Router - Log viewing and streaming endpoints."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import json
import os
import sys

# Add parent directory to path for imports
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, backend_dir)

from utils.paths import get_log_dir

router = APIRouter()


class LogEntry(BaseModel):
    """Log entry model."""
    id: str
    timestamp: str
    event_type: str
    crawl_id: str
    details: Dict[str, Any] = {}
    level: str = "info"


class LogsResponse(BaseModel):
    """Response for log listing."""
    logs: List[LogEntry]
    total: int


def _get_logs_from_files(crawl_id: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    """Extract logs from crawl event files."""
    log_dir = get_log_dir()
    logs = []

    if not log_dir.exists():
        return logs

    # Determine which log files to read
    if crawl_id:
        log_files = [log_dir / f"crawl_{crawl_id}_events.jsonl"]
    else:
        log_files = list(log_dir.glob("crawl_*_events.jsonl"))
        # Sort by modification time, newest first
        log_files.sort(key=lambda x: x.stat().st_mtime if x.exists() else 0, reverse=True)

    log_id_counter = 0
    for log_file in log_files:
        if not log_file.exists():
            continue

        try:
            with open(log_file, 'r') as f:
                for line in f:
                    try:
                        event = json.loads(line.strip())
                        log_id_counter += 1

                        # Determine log level based on event type
                        event_type = event.get("event_type", "")
                        if "error" in event_type.lower():
                            level = "error"
                        elif "warning" in event_type.lower() or "failed" in event_type.lower():
                            level = "warning"
                        else:
                            level = "info"

                        log_entry = {
                            "id": f"log_{log_id_counter}",
                            "timestamp": event.get("timestamp", datetime.now().isoformat()),
                            "event_type": event_type,
                            "crawl_id": event.get("crawl_id", ""),
                            "details": event.get("data", {}),
                            "level": level
                        }
                        logs.append(log_entry)

                    except json.JSONDecodeError:
                        continue

        except Exception as e:
            print(f"Error reading log file {log_file}: {e}")
            continue

    # Sort by timestamp descending (most recent first)
    logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

    return logs[:limit]


@router.get("/logs/all", response_model=LogsResponse)
async def get_all_logs(
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of logs to return")
):
    """Get all logs across crawls."""
    logs = _get_logs_from_files(crawl_id=None, limit=limit)

    return LogsResponse(
        logs=[LogEntry(**log) for log in logs],
        total=len(logs)
    )


@router.get("/logs/{crawl_id}", response_model=LogsResponse)
async def get_crawl_logs(
    crawl_id: str,
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of logs to return")
):
    """Get logs for specific crawl."""
    logs = _get_logs_from_files(crawl_id=crawl_id, limit=limit)

    return LogsResponse(
        logs=[LogEntry(**log) for log in logs],
        total=len(logs)
    )
