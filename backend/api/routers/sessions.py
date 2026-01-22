"""
Sessions API Router

Provides session management endpoints for:
- Session creation and retrieval
- Session state persistence
- Activity tracking
- Multi-device sync support
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime
import json
from pathlib import Path

router = APIRouter(prefix="/sessions", tags=["sessions"])

# Storage directory
SESSIONS_DIR = Path("data/sessions")
SESSIONS_DIR.mkdir(parents=True, exist_ok=True)


class SessionState(BaseModel):
    """Session state model."""
    session_id: str
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    last_updated: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    active_tab: str = "overview"
    active_crawls: List[str] = Field(default_factory=list)
    dark_mode: bool = False
    sidebar_collapsed: bool = False
    view_mode: str = "grid"
    search_query: str = ""
    filters: Dict[str, Any] = Field(default_factory=dict)
    recent_searches: List[str] = Field(default_factory=list)
    favorite_templates: List[str] = Field(default_factory=list)
    custom_settings: Dict[str, Any] = Field(default_factory=dict)


class SessionStateUpdate(BaseModel):
    """Session state update model (partial)."""
    active_tab: Optional[str] = None
    active_crawls: Optional[List[str]] = None
    dark_mode: Optional[bool] = None
    sidebar_collapsed: Optional[bool] = None
    view_mode: Optional[str] = None
    search_query: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None
    recent_searches: Optional[List[str]] = None
    favorite_templates: Optional[List[str]] = None
    custom_settings: Optional[Dict[str, Any]] = None


class ActivityEntry(BaseModel):
    """Activity tracking entry."""
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    action: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    session_id: Optional[str] = None


class ActivityLogRequest(BaseModel):
    """Request for logging activity."""
    action: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


def get_session_path(session_id: str) -> Path:
    """Get the file path for a session."""
    return SESSIONS_DIR / f"{session_id}.json"


def load_session(session_id: str) -> Optional[SessionState]:
    """Load session from file."""
    path = get_session_path(session_id)
    if not path.exists():
        return None
    try:
        with open(path, 'r') as f:
            data = json.load(f)
            return SessionState(**data)
    except Exception as e:
        print(f"Error loading session {session_id}: {e}")
        return None


def save_session(session: SessionState) -> bool:
    """Save session to file."""
    try:
        path = get_session_path(session.session_id)
        with open(path, 'w') as f:
            json.dump(session.dict(), f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving session {session.session_id}: {e}")
        return False


@router.get("/{session_id}", response_model=SessionState)
async def get_session(session_id: str):
    """
    Get session state by ID.

    If session doesn't exist, creates a new one.
    """
    session = load_session(session_id)
    if session:
        return session

    # Create new session
    session = SessionState(session_id=session_id)
    save_session(session)
    return session


@router.put("/{session_id}", response_model=SessionState)
async def update_session(session_id: str, update: SessionStateUpdate):
    """
    Update session state.

    Merges provided fields with existing session.
    """
    session = load_session(session_id)
    if not session:
        session = SessionState(session_id=session_id)

    # Update provided fields
    update_data = update.dict(exclude_none=True)
    for key, value in update_data.items():
        setattr(session, key, value)

    session.last_updated = datetime.utcnow().isoformat()

    if not save_session(session):
        raise HTTPException(status_code=500, detail="Failed to save session")

    return session


@router.delete("/{session_id}")
async def delete_session(session_id: str):
    """Delete a session."""
    path = get_session_path(session_id)
    if path.exists():
        path.unlink()
        return {"deleted": True, "session_id": session_id}
    return {"deleted": False, "session_id": session_id, "message": "Session not found"}


@router.post("/{session_id}/activity")
async def log_activity(session_id: str, activity: ActivityLogRequest):
    """
    Log user activity for a session.

    Used for analytics and debugging.
    """
    activity_entry = ActivityEntry(
        action=activity.action,
        metadata=activity.metadata,
        session_id=session_id,
    )

    # Load existing activities
    activity_file = SESSIONS_DIR / f"{session_id}_activity.json"
    activities = []

    if activity_file.exists():
        try:
            with open(activity_file, 'r') as f:
                activities = json.load(f)
        except Exception:
            activities = []

    # Append new activity
    activities.append(activity_entry.dict())

    # Keep last 1000 activities
    activities = activities[-1000:]

    # Save activities
    try:
        with open(activity_file, 'w') as f:
            json.dump(activities, f, indent=2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log activity: {e}")

    return {"logged": True, "activity_count": len(activities)}


@router.get("/{session_id}/activity", response_model=List[ActivityEntry])
async def get_activity(session_id: str, limit: int = 100):
    """Get activity history for a session."""
    activity_file = SESSIONS_DIR / f"{session_id}_activity.json"

    if not activity_file.exists():
        return []

    try:
        with open(activity_file, 'r') as f:
            activities = json.load(f)
        return [ActivityEntry(**a) for a in activities[-limit:]]
    except Exception as e:
        print(f"Error loading activities: {e}")
        return []


@router.get("/")
async def list_sessions(limit: int = 100):
    """List all sessions."""
    sessions = []

    for path in SESSIONS_DIR.glob("*.json"):
        # Skip activity files
        if "_activity" in path.name:
            continue

        try:
            with open(path, 'r') as f:
                data = json.load(f)
                sessions.append({
                    "session_id": data.get("session_id"),
                    "created_at": data.get("created_at"),
                    "last_updated": data.get("last_updated"),
                })
        except Exception:
            continue

    # Sort by last_updated descending
    sessions.sort(key=lambda x: x.get("last_updated", ""), reverse=True)

    return {
        "sessions": sessions[:limit],
        "total": len(sessions),
    }
