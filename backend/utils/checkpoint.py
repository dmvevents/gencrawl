"""
Checkpoint System - Resume/Continue Functionality

Features:
- Save crawler state at intervals
- Include: crawled URLs, discovered URLs, downloaded docs, current state
- Resume from checkpoint
- Checkpoint versioning
- Automatic checkpoint on pause
"""

from typing import Dict, Any, Optional, List, Set
from datetime import datetime
from pydantic import BaseModel, Field
from pathlib import Path
import json
import gzip
from enum import Enum


class CheckpointType(str, Enum):
    """Types of checkpoints."""
    AUTO = "auto"  # Automatic periodic checkpoint
    MANUAL = "manual"  # Manual user-triggered checkpoint
    PAUSE = "pause"  # Checkpoint on pause
    ERROR = "error"  # Checkpoint on error (for recovery)


class CheckpointMetadata(BaseModel):
    """Metadata for a checkpoint."""
    checkpoint_id: str
    crawl_id: str
    checkpoint_number: int  # Sequential number
    checkpoint_type: CheckpointType

    created_at: datetime = Field(default_factory=datetime.utcnow)

    # State information
    current_state: str
    current_substate: Optional[str] = None

    # Progress snapshot
    progress: Dict[str, Any] = Field(default_factory=dict)

    # Statistics snapshot
    metrics: Dict[str, Any] = Field(default_factory=dict)

    # Resumability
    can_resume: bool = True
    resume_supported: bool = True

    # Storage
    checkpoint_file: Optional[str] = None
    compressed: bool = True
    file_size_bytes: Optional[int] = None

    # Additional metadata
    metadata: Dict[str, Any] = Field(default_factory=dict)


class CheckpointData(BaseModel):
    """Complete checkpoint data for resuming."""
    checkpoint_id: str
    crawl_id: str
    created_at: datetime

    # State
    current_state: str
    current_substate: Optional[str] = None

    # URLs
    crawled_urls: Set[str] = Field(default_factory=set)
    queued_urls: Set[str] = Field(default_factory=set)
    failed_urls: Set[str] = Field(default_factory=set)

    # Documents
    downloaded_documents: List[Dict[str, Any]] = Field(default_factory=list)
    processed_documents: List[str] = Field(default_factory=list)  # URLs

    # Progress tracking
    progress: Dict[str, Any] = Field(default_factory=dict)

    # Metrics
    metrics: Dict[str, Any] = Field(default_factory=dict)

    # Configuration
    config: Dict[str, Any] = Field(default_factory=dict)

    # State history
    state_history: List[Dict[str, Any]] = Field(default_factory=list)

    # Error tracking
    error_count: int = 0
    last_error: Optional[str] = None

    class Config:
        """Pydantic config."""
        json_encoders = {
            set: list,  # Convert sets to lists for JSON
            datetime: lambda v: v.isoformat()
        }


class CheckpointManager:
    """Manages checkpoints for crawls."""

    def __init__(self, storage_dir: Path = None):
        """Initialize checkpoint manager."""
        if storage_dir is None:
            storage_dir = Path(__file__).parent.parent.parent / "data" / "checkpoints"

        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

        # In-memory storage
        self.checkpoints: Dict[str, List[CheckpointMetadata]] = {}  # crawl_id -> [checkpoints]

        # Load existing checkpoints
        self._load_checkpoints()

    def create_checkpoint(
        self,
        crawl_id: str,
        state_data: Any,  # CrawlStateData from state machine
        checkpoint_type: CheckpointType = CheckpointType.AUTO,
        metadata: Dict[str, Any] = None
    ) -> str:
        """
        Create a checkpoint for a crawl.

        Args:
            crawl_id: Crawl identifier
            state_data: Current state data
            checkpoint_type: Type of checkpoint
            metadata: Additional metadata

        Returns:
            checkpoint_id
        """
        # Get existing checkpoints for this crawl
        existing = self.checkpoints.get(crawl_id, [])
        checkpoint_number = len(existing)

        # Generate checkpoint ID
        checkpoint_id = f"{crawl_id}_ckpt_{checkpoint_number}"

        # Create checkpoint data
        checkpoint_data = CheckpointData(
            checkpoint_id=checkpoint_id,
            crawl_id=crawl_id,
            created_at=datetime.utcnow(),
            current_state=state_data.current_state.value if hasattr(state_data.current_state, 'value') else str(state_data.current_state),
            current_substate=state_data.current_substate.value if state_data.current_substate and hasattr(state_data.current_substate, 'value') else None,
            progress=self._extract_progress(state_data),
            metrics=self._extract_metrics(state_data),
            state_history=self._extract_state_history(state_data),
            error_count=getattr(state_data, 'error_count', 0),
            last_error=getattr(state_data, 'error_message', None),
        )

        # Create metadata
        checkpoint_meta = CheckpointMetadata(
            checkpoint_id=checkpoint_id,
            crawl_id=crawl_id,
            checkpoint_number=checkpoint_number,
            checkpoint_type=checkpoint_type,
            current_state=checkpoint_data.current_state,
            current_substate=checkpoint_data.current_substate,
            progress=checkpoint_data.progress,
            metrics=checkpoint_data.metrics,
            metadata=metadata or {},
        )

        # Save to disk
        checkpoint_file = self._save_checkpoint(checkpoint_data, checkpoint_meta)
        checkpoint_meta.checkpoint_file = str(checkpoint_file)
        checkpoint_meta.file_size_bytes = checkpoint_file.stat().st_size

        # Store metadata
        if crawl_id not in self.checkpoints:
            self.checkpoints[crawl_id] = []
        self.checkpoints[crawl_id].append(checkpoint_meta)

        # Save metadata separately
        self._save_checkpoint_metadata(checkpoint_meta)

        return checkpoint_id

    def get_checkpoint(self, checkpoint_id: str) -> Optional[CheckpointData]:
        """Load a checkpoint from disk."""
        # Find checkpoint metadata
        checkpoint_meta = None
        for crawl_checkpoints in self.checkpoints.values():
            for ckpt in crawl_checkpoints:
                if ckpt.checkpoint_id == checkpoint_id:
                    checkpoint_meta = ckpt
                    break
            if checkpoint_meta:
                break

        if not checkpoint_meta or not checkpoint_meta.checkpoint_file:
            return None

        # Load checkpoint data
        checkpoint_file = Path(checkpoint_meta.checkpoint_file)
        if not checkpoint_file.exists():
            return None

        try:
            if checkpoint_meta.compressed:
                with gzip.open(checkpoint_file, 'rt') as f:
                    data = json.load(f)
            else:
                with open(checkpoint_file, 'r') as f:
                    data = json.load(f)

            # Convert sets back from lists
            if 'crawled_urls' in data:
                data['crawled_urls'] = set(data['crawled_urls'])
            if 'queued_urls' in data:
                data['queued_urls'] = set(data['queued_urls'])
            if 'failed_urls' in data:
                data['failed_urls'] = set(data['failed_urls'])

            return CheckpointData(**data)

        except Exception as e:
            print(f"Error loading checkpoint {checkpoint_id}: {e}")
            return None

    def get_latest_checkpoint(self, crawl_id: str) -> Optional[CheckpointMetadata]:
        """Get the most recent checkpoint for a crawl."""
        checkpoints = self.checkpoints.get(crawl_id, [])
        if not checkpoints:
            return None

        # Return last checkpoint (highest number)
        return checkpoints[-1]

    def get_checkpoints_for_crawl(self, crawl_id: str) -> List[CheckpointMetadata]:
        """Get all checkpoints for a crawl, sorted by checkpoint number."""
        return self.checkpoints.get(crawl_id, [])

    def can_resume(self, crawl_id: str) -> bool:
        """Check if a crawl can be resumed from checkpoint."""
        latest = self.get_latest_checkpoint(crawl_id)
        return latest is not None and latest.can_resume

    def resume_from_checkpoint(
        self,
        checkpoint_id: str,
        validate: bool = True
    ) -> Optional[CheckpointData]:
        """
        Resume a crawl from a checkpoint.

        Args:
            checkpoint_id: Checkpoint to resume from
            validate: Validate checkpoint before resuming

        Returns:
            CheckpointData if valid, None otherwise
        """
        checkpoint_data = self.get_checkpoint(checkpoint_id)

        if not checkpoint_data:
            return None

        if validate:
            # Validation checks
            if checkpoint_data.current_state in ['completed', 'failed', 'cancelled']:
                print(f"Cannot resume from terminal state: {checkpoint_data.current_state}")
                return None

        return checkpoint_data

    def delete_checkpoint(self, checkpoint_id: str) -> bool:
        """Delete a checkpoint."""
        # Find and remove from memory
        found = False
        for crawl_id, checkpoints in self.checkpoints.items():
            for i, ckpt in enumerate(checkpoints):
                if ckpt.checkpoint_id == checkpoint_id:
                    # Delete file
                    if ckpt.checkpoint_file:
                        checkpoint_file = Path(ckpt.checkpoint_file)
                        if checkpoint_file.exists():
                            checkpoint_file.unlink()

                        # Delete metadata file
                        meta_file = checkpoint_file.parent / f"{checkpoint_id}_meta.json"
                        if meta_file.exists():
                            meta_file.unlink()

                    # Remove from memory
                    checkpoints.pop(i)
                    found = True
                    break
            if found:
                break

        return found

    def delete_old_checkpoints(
        self,
        crawl_id: str,
        keep_last: int = 3
    ) -> int:
        """
        Delete old checkpoints, keeping only the most recent N.

        Args:
            crawl_id: Crawl identifier
            keep_last: Number of recent checkpoints to keep

        Returns:
            Number of checkpoints deleted
        """
        checkpoints = self.checkpoints.get(crawl_id, [])

        if len(checkpoints) <= keep_last:
            return 0

        # Delete older checkpoints
        to_delete = checkpoints[:-keep_last]
        deleted_count = 0

        for ckpt in to_delete:
            if self.delete_checkpoint(ckpt.checkpoint_id):
                deleted_count += 1

        return deleted_count

    def _extract_progress(self, state_data: Any) -> Dict[str, Any]:
        """Extract progress data from state data."""
        if not hasattr(state_data, 'progress'):
            return {}

        progress = {}
        for key, prog in state_data.progress.items():
            if hasattr(prog, 'dict'):
                progress[key] = prog.dict()
            elif hasattr(prog, '__dict__'):
                progress[key] = prog.__dict__
            else:
                progress[key] = {
                    "total": getattr(prog, 'total', 0),
                    "completed": getattr(prog, 'completed', 0),
                    "failed": getattr(prog, 'failed', 0),
                }

        return progress

    def _extract_metrics(self, state_data: Any) -> Dict[str, Any]:
        """Extract metrics from state data."""
        if not hasattr(state_data, 'metrics'):
            return {}

        metrics = state_data.metrics
        if hasattr(metrics, 'dict'):
            return metrics.dict()
        elif hasattr(metrics, '__dict__'):
            return metrics.__dict__
        else:
            return {}

    def _extract_state_history(self, state_data: Any) -> List[Dict[str, Any]]:
        """Extract state history from state data."""
        if not hasattr(state_data, 'state_history'):
            return []

        history = []
        for transition in state_data.state_history:
            if hasattr(transition, 'dict'):
                history.append(transition.dict())
            elif hasattr(transition, '__dict__'):
                entry = {
                    'from_state': getattr(transition, 'from_state', ''),
                    'to_state': getattr(transition, 'to_state', ''),
                    'timestamp': getattr(transition, 'timestamp', datetime.utcnow()).isoformat(),
                    'duration_seconds': getattr(transition, 'duration_seconds', None),
                }
                history.append(entry)

        return history

    def _save_checkpoint(
        self,
        checkpoint_data: CheckpointData,
        checkpoint_meta: CheckpointMetadata
    ) -> Path:
        """Save checkpoint data to disk."""
        # Create directory for this crawl's checkpoints
        crawl_dir = self.storage_dir / checkpoint_data.crawl_id
        crawl_dir.mkdir(parents=True, exist_ok=True)

        checkpoint_file = crawl_dir / f"{checkpoint_data.checkpoint_id}.json.gz"

        # Serialize data
        data = checkpoint_data.dict()

        # Convert sets to lists for JSON
        if 'crawled_urls' in data:
            data['crawled_urls'] = list(data['crawled_urls'])
        if 'queued_urls' in data:
            data['queued_urls'] = list(data['queued_urls'])
        if 'failed_urls' in data:
            data['failed_urls'] = list(data['failed_urls'])

        # Save compressed
        with gzip.open(checkpoint_file, 'wt') as f:
            json.dump(data, f, indent=2, default=str)

        return checkpoint_file

    def _save_checkpoint_metadata(self, checkpoint_meta: CheckpointMetadata):
        """Save checkpoint metadata separately for quick access."""
        meta_file = self.storage_dir / checkpoint_meta.crawl_id / f"{checkpoint_meta.checkpoint_id}_meta.json"

        with open(meta_file, 'w') as f:
            json.dump(checkpoint_meta.dict(), f, indent=2, default=str)

    def _load_checkpoints(self):
        """Load checkpoint metadata from disk."""
        if not self.storage_dir.exists():
            return

        for crawl_dir in self.storage_dir.iterdir():
            if not crawl_dir.is_dir():
                continue

            crawl_id = crawl_dir.name

            for meta_file in crawl_dir.glob("*_meta.json"):
                try:
                    with open(meta_file, 'r') as f:
                        data = json.load(f)
                        checkpoint_meta = CheckpointMetadata(**data)

                        if crawl_id not in self.checkpoints:
                            self.checkpoints[crawl_id] = []

                        self.checkpoints[crawl_id].append(checkpoint_meta)

                except Exception as e:
                    print(f"Error loading checkpoint metadata from {meta_file}: {e}")

            # Sort checkpoints by number
            if crawl_id in self.checkpoints:
                self.checkpoints[crawl_id].sort(key=lambda x: x.checkpoint_number)

    def get_statistics(self, crawl_id: str) -> Dict[str, Any]:
        """Get checkpoint statistics for a crawl."""
        checkpoints = self.checkpoints.get(crawl_id, [])

        if not checkpoints:
            return {
                "total_checkpoints": 0,
                "can_resume": False,
            }

        latest = checkpoints[-1]

        return {
            "total_checkpoints": len(checkpoints),
            "latest_checkpoint_id": latest.checkpoint_id,
            "latest_checkpoint_created": latest.created_at.isoformat(),
            "latest_checkpoint_state": latest.current_state,
            "can_resume": latest.can_resume,
            "checkpoint_types": {
                "auto": len([c for c in checkpoints if c.checkpoint_type == CheckpointType.AUTO]),
                "manual": len([c for c in checkpoints if c.checkpoint_type == CheckpointType.MANUAL]),
                "pause": len([c for c in checkpoints if c.checkpoint_type == CheckpointType.PAUSE]),
                "error": len([c for c in checkpoints if c.checkpoint_type == CheckpointType.ERROR]),
            },
            "total_size_bytes": sum(c.file_size_bytes or 0 for c in checkpoints),
        }
