"""
Crawler State Machine

State Flow:
QUEUED → INITIALIZING → CRAWLING → EXTRACTING → PROCESSING → COMPLETED/FAILED

Substates:
- CRAWLING: discovering_urls, downloading_pages, downloading_documents
- EXTRACTING: pdf_extraction, ocr, table_detection
- PROCESSING: metadata_extraction, quality_scoring, deduplication, nemo_curation
"""

from enum import Enum
from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class CrawlState(str, Enum):
    """Main crawler states."""
    QUEUED = "queued"
    INITIALIZING = "initializing"
    CRAWLING = "crawling"
    EXTRACTING = "extracting"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class CrawlSubstate(str, Enum):
    """Substates for each main state."""
    # CRAWLING substates
    DISCOVERING_URLS = "discovering_urls"
    DOWNLOADING_PAGES = "downloading_pages"
    DOWNLOADING_DOCUMENTS = "downloading_documents"

    # EXTRACTING substates
    PDF_EXTRACTION = "pdf_extraction"
    OCR = "ocr"
    TABLE_DETECTION = "table_detection"

    # PROCESSING substates
    METADATA_EXTRACTION = "metadata_extraction"
    QUALITY_SCORING = "quality_scoring"
    DEDUPLICATION = "deduplication"
    NEMO_CURATION = "nemo_curation"


class StateTransition(BaseModel):
    """Represents a state transition."""
    from_state: CrawlState
    to_state: CrawlState
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    duration_seconds: Optional[float] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class CrawlProgress(BaseModel):
    """Tracks progress for each stage."""
    total: int = 0
    completed: int = 0
    failed: int = 0

    @property
    def percentage(self) -> float:
        """Calculate completion percentage."""
        if self.total == 0:
            return 0.0
        return (self.completed / self.total) * 100.0

    @property
    def remaining(self) -> int:
        """Calculate remaining items."""
        return self.total - self.completed - self.failed


class CrawlMetrics(BaseModel):
    """Real-time metrics for a crawl job."""
    # URL metrics
    urls_queued: int = 0
    urls_crawled: int = 0
    urls_failed: int = 0

    # Document metrics
    documents_found: int = 0
    documents_downloaded: int = 0
    documents_processed: int = 0

    # Performance metrics
    pages_per_minute: float = 0.0
    download_speed_mbps: float = 0.0
    success_rate: float = 100.0

    # Quality metrics
    avg_quality_score: float = 0.0
    quality_threshold: float = 0.7

    # Resource metrics
    memory_usage_mb: float = 0.0
    cpu_usage_percent: float = 0.0

    # Timing
    estimated_completion_time: Optional[datetime] = None
    current_throughput: float = 0.0  # items per second

    def update_success_rate(self):
        """Calculate and update success rate."""
        total = self.urls_crawled + self.urls_failed
        if total > 0:
            self.success_rate = (self.urls_crawled / total) * 100.0


class CrawlStateData(BaseModel):
    """Complete state data for a crawl job."""
    crawl_id: str
    current_state: CrawlState = CrawlState.QUEUED
    current_substate: Optional[CrawlSubstate] = None
    config: Optional[Dict[str, Any]] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    paused_at: Optional[datetime] = None

    # Progress tracking
    progress: Dict[str, CrawlProgress] = Field(default_factory=dict)

    # Metrics
    metrics: CrawlMetrics = Field(default_factory=CrawlMetrics)

    # State history
    state_history: List[StateTransition] = Field(default_factory=list)

    # Error tracking
    error_message: Optional[str] = None
    error_count: int = 0

    @property
    def duration_seconds(self) -> Optional[float]:
        """Calculate total duration."""
        if not self.started_at:
            return None

        end_time = self.completed_at or datetime.utcnow()
        return (end_time - self.started_at).total_seconds()

    @property
    def overall_progress_percentage(self) -> float:
        """Calculate overall progress across all stages."""
        if not self.progress:
            return 0.0

        total_items = sum(p.total for p in self.progress.values())
        completed_items = sum(p.completed for p in self.progress.values())

        if total_items == 0:
            return 0.0

        return (completed_items / total_items) * 100.0


class CrawlStateMachine:
    """Manages state transitions and validation."""

    # Valid state transitions
    VALID_TRANSITIONS = {
        CrawlState.QUEUED: [CrawlState.INITIALIZING, CrawlState.CANCELLED],
        CrawlState.INITIALIZING: [CrawlState.CRAWLING, CrawlState.FAILED, CrawlState.CANCELLED],
        CrawlState.CRAWLING: [CrawlState.EXTRACTING, CrawlState.PAUSED, CrawlState.FAILED, CrawlState.CANCELLED],
        CrawlState.EXTRACTING: [CrawlState.PROCESSING, CrawlState.PAUSED, CrawlState.FAILED, CrawlState.CANCELLED],
        CrawlState.PROCESSING: [CrawlState.COMPLETED, CrawlState.PAUSED, CrawlState.FAILED, CrawlState.CANCELLED],
        CrawlState.PAUSED: [CrawlState.CRAWLING, CrawlState.EXTRACTING, CrawlState.PROCESSING, CrawlState.CANCELLED],
        CrawlState.COMPLETED: [],  # Terminal state
        CrawlState.FAILED: [],  # Terminal state
        CrawlState.CANCELLED: [],  # Terminal state
    }

    # Substates for each main state
    STATE_SUBSTATES = {
        CrawlState.CRAWLING: [
            CrawlSubstate.DISCOVERING_URLS,
            CrawlSubstate.DOWNLOADING_PAGES,
            CrawlSubstate.DOWNLOADING_DOCUMENTS,
        ],
        CrawlState.EXTRACTING: [
            CrawlSubstate.PDF_EXTRACTION,
            CrawlSubstate.OCR,
            CrawlSubstate.TABLE_DETECTION,
        ],
        CrawlState.PROCESSING: [
            CrawlSubstate.METADATA_EXTRACTION,
            CrawlSubstate.QUALITY_SCORING,
            CrawlSubstate.DEDUPLICATION,
            CrawlSubstate.NEMO_CURATION,
        ],
    }

    def __init__(self, state_data: CrawlStateData):
        self.state_data = state_data

    def can_transition(self, to_state: CrawlState) -> bool:
        """Check if transition is valid."""
        valid_next_states = self.VALID_TRANSITIONS.get(self.state_data.current_state, [])
        return to_state in valid_next_states

    def transition(self, to_state: CrawlState, metadata: Dict[str, Any] = None) -> bool:
        """Perform state transition with validation."""
        if not self.can_transition(to_state):
            raise ValueError(
                f"Invalid transition from {self.state_data.current_state} to {to_state}. "
                f"Valid transitions: {self.VALID_TRANSITIONS.get(self.state_data.current_state, [])}"
            )

        # Calculate duration in previous state
        duration = None
        if self.state_data.state_history:
            last_transition = self.state_data.state_history[-1]
            duration = (datetime.utcnow() - last_transition.timestamp).total_seconds()

        # Record transition
        transition = StateTransition(
            from_state=self.state_data.current_state,
            to_state=to_state,
            duration_seconds=duration,
            metadata=metadata or {}
        )

        self.state_data.state_history.append(transition)
        self.state_data.current_state = to_state

        # Update timestamps
        if to_state == CrawlState.INITIALIZING and not self.state_data.started_at:
            self.state_data.started_at = datetime.utcnow()
        elif to_state in [CrawlState.COMPLETED, CrawlState.FAILED, CrawlState.CANCELLED]:
            self.state_data.completed_at = datetime.utcnow()
        elif to_state == CrawlState.PAUSED:
            self.state_data.paused_at = datetime.utcnow()

        return True

    def set_substate(self, substate: CrawlSubstate) -> bool:
        """Set substate for current main state."""
        valid_substates = self.STATE_SUBSTATES.get(self.state_data.current_state, [])

        if substate not in valid_substates:
            raise ValueError(
                f"Invalid substate {substate} for state {self.state_data.current_state}. "
                f"Valid substates: {valid_substates}"
            )

        self.state_data.current_substate = substate
        return True

    def get_next_substates(self) -> List[CrawlSubstate]:
        """Get valid substates for current state."""
        return self.STATE_SUBSTATES.get(self.state_data.current_state, [])

    def is_terminal_state(self) -> bool:
        """Check if current state is terminal."""
        return self.state_data.current_state in [
            CrawlState.COMPLETED,
            CrawlState.FAILED,
            CrawlState.CANCELLED
        ]

    def can_pause(self) -> bool:
        """Check if crawl can be paused."""
        return self.state_data.current_state in [
            CrawlState.CRAWLING,
            CrawlState.EXTRACTING,
            CrawlState.PROCESSING
        ]

    def can_resume(self) -> bool:
        """Check if crawl can be resumed."""
        return self.state_data.current_state == CrawlState.PAUSED

    def get_state_summary(self) -> Dict[str, Any]:
        """Get comprehensive state summary."""
        return {
            "crawl_id": self.state_data.crawl_id,
            "current_state": self.state_data.current_state,
            "current_substate": self.state_data.current_substate,
            "duration_seconds": self.state_data.duration_seconds,
            "overall_progress": self.state_data.overall_progress_percentage,
            "is_terminal": self.is_terminal_state(),
            "can_pause": self.can_pause(),
            "can_resume": self.can_resume(),
            "metrics": self.state_data.metrics.dict(),
            "error_count": self.state_data.error_count,
            "created_at": self.state_data.created_at.isoformat(),
            "started_at": self.state_data.started_at.isoformat() if self.state_data.started_at else None,
            "completed_at": self.state_data.completed_at.isoformat() if self.state_data.completed_at else None,
        }
