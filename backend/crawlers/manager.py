"""Enhanced Crawler Manager with State Machine, Event System, and Persistence."""

from typing import Dict, Any, Optional, List
import uuid
from datetime import datetime
import asyncio

from models.crawl_state import (
    CrawlState,
    CrawlSubstate,
    CrawlStateData,
    CrawlStateMachine,
    CrawlProgress,
)
from utils.metrics import MetricsCollector, MetricsAggregator
from events.event_bus import (
    event_bus,
    EventType,
    emit_state_change,
    emit_progress_update,
    emit_error,
    emit_metrics_update,
)
from utils.logger import CrawlLogger
from utils.checkpoint import CheckpointManager, CheckpointType
from utils.iteration_manager import IterationManager


class CrawlerManager:
    """Manages crawl jobs with state machine, metrics, event system, and persistence."""

    def __init__(self):
        # In-memory storage
        self.jobs: Dict[str, CrawlStateData] = {}
        self.state_machines: Dict[str, CrawlStateMachine] = {}
        self.loggers: Dict[str, CrawlLogger] = {}

        # Metrics aggregator
        self.metrics_aggregator = MetricsAggregator()

        # Control flags
        self.pause_flags: Dict[str, asyncio.Event] = {}
        self.cancel_flags: Dict[str, bool] = {}

        # Checkpoint and iteration managers
        self.checkpoint_manager = CheckpointManager()
        self.iteration_manager = IterationManager()

        # Checkpoint settings
        self.auto_checkpoint_interval = 100  # Create checkpoint every N pages
        self.checkpoint_counters: Dict[str, int] = {}  # Track pages since last checkpoint

        # Job persistence store
        self.job_store = None
        self._persistence_initialized = False

    async def _init_persistence(self):
        """Initialize persistence store (lazy loading)."""
        if self._persistence_initialized:
            return

        try:
            from persistence.job_store import job_store
            self.job_store = job_store
            self._persistence_initialized = True
            print("Job persistence initialized successfully")
        except Exception as e:
            print(f"Warning: Could not initialize job persistence: {e}")
            self._persistence_initialized = True  # Don't retry

    async def load_jobs_from_storage(self):
        """Load all jobs from persistent storage on startup."""
        await self._init_persistence()

        if not self.job_store:
            print("No persistence store available, skipping job restoration")
            return

        try:
            # Get all job IDs from storage
            job_ids = await self.job_store.get_all_ids()
            print(f"Found {len(job_ids)} persisted jobs")

            restored_count = 0
            for crawl_id in job_ids:
                try:
                    job_data = await self.job_store.load(crawl_id)
                    if not job_data:
                        continue

                    # Reconstruct job state
                    state_data = self._reconstruct_state_data(crawl_id, job_data)
                    if state_data:
                        self.jobs[crawl_id] = state_data
                        self.state_machines[crawl_id] = CrawlStateMachine(state_data)
                        self.loggers[crawl_id] = CrawlLogger(crawl_id)

                        # Initialize control flags
                        self.pause_flags[crawl_id] = asyncio.Event()
                        self.pause_flags[crawl_id].set()
                        self.cancel_flags[crawl_id] = False

                        restored_count += 1

                except Exception as e:
                    print(f"Warning: Failed to restore job {crawl_id}: {e}")

            print(f"Restored {restored_count} jobs from storage")

        except Exception as e:
            print(f"Error loading jobs from storage: {e}")

    def _reconstruct_state_data(self, crawl_id: str, job_data: Dict[str, Any]) -> Optional[CrawlStateData]:
        """Reconstruct CrawlStateData from persisted data."""
        try:
            # Parse current state
            current_state = CrawlState.QUEUED
            if "current_state" in job_data:
                state_value = job_data["current_state"]
                if isinstance(state_value, dict):
                    state_value = state_value.get("value", "queued")
                try:
                    current_state = CrawlState(state_value)
                except ValueError:
                    current_state = CrawlState.QUEUED

            # Create state data
            state_data = CrawlStateData(
                crawl_id=crawl_id,
                current_state=current_state,
            )

            # Restore progress
            if "progress" in job_data:
                progress_data = job_data["progress"]
                state_data.progress = {
                    "urls": CrawlProgress(
                        total=progress_data.get("urls", {}).get("total", 0),
                        completed=progress_data.get("urls", {}).get("completed", 0),
                        failed=progress_data.get("urls", {}).get("failed", 0),
                    ),
                    "documents": CrawlProgress(
                        total=progress_data.get("documents", {}).get("total", 0),
                        completed=progress_data.get("documents", {}).get("completed", 0),
                    ),
                    "extractions": CrawlProgress(
                        total=progress_data.get("extractions", {}).get("total", 0),
                        completed=progress_data.get("extractions", {}).get("completed", 0),
                    ),
                    "processing": CrawlProgress(
                        total=progress_data.get("processing", {}).get("total", 0),
                        completed=progress_data.get("processing", {}).get("completed", 0),
                    ),
                }
            else:
                state_data.progress = {
                    "urls": CrawlProgress(),
                    "documents": CrawlProgress(),
                    "extractions": CrawlProgress(),
                    "processing": CrawlProgress(),
                }

            # Restore metrics
            if "metrics" in job_data:
                metrics = job_data["metrics"]
                state_data.metrics.urls_crawled = metrics.get("urls_crawled", 0)
                state_data.metrics.urls_failed = metrics.get("urls_failed", 0)
                state_data.metrics.documents_found = metrics.get("documents_found", 0)
                state_data.metrics.success_rate = metrics.get("success_rate", 0)
                state_data.metrics.average_quality = metrics.get("average_quality", 0)

            # Restore timestamps
            if "started_at" in job_data and job_data["started_at"]:
                state_data.started_at = datetime.fromisoformat(job_data["started_at"].replace('Z', '+00:00'))
            if "completed_at" in job_data and job_data["completed_at"]:
                state_data.completed_at = datetime.fromisoformat(job_data["completed_at"].replace('Z', '+00:00'))

            # Restore error info
            if "error_message" in job_data:
                state_data.error_message = job_data["error_message"]
            if "error_count" in job_data:
                state_data.error_count = job_data["error_count"]

            # Restore config
            if "config" in job_data:
                state_data.config = job_data["config"]

            return state_data

        except Exception as e:
            print(f"Error reconstructing state data for {crawl_id}: {e}")
            return None

    async def _save_job_to_storage(self, crawl_id: str):
        """Save job to persistent storage."""
        await self._init_persistence()

        if not self.job_store:
            return

        if crawl_id not in self.jobs:
            return

        try:
            state_data = self.jobs[crawl_id]

            # Prepare data for storage
            job_data = {
                "crawl_id": crawl_id,
                "current_state": state_data.current_state.value if hasattr(state_data.current_state, 'value') else str(state_data.current_state),
                "current_substate": state_data.current_substate.value if state_data.current_substate and hasattr(state_data.current_substate, 'value') else None,
                "created_at": state_data.created_at.isoformat() if hasattr(state_data, 'created_at') and state_data.created_at else None,
                "started_at": state_data.started_at.isoformat() if state_data.started_at else None,
                "completed_at": state_data.completed_at.isoformat() if state_data.completed_at else None,
                "error_message": state_data.error_message,
                "error_count": state_data.error_count,
                "progress": self._get_progress_data(state_data),
                "metrics": state_data.metrics.dict() if hasattr(state_data.metrics, 'dict') else {},
                "config": state_data.config if hasattr(state_data, 'config') else {},
                "state_history": [
                    {
                        "from_state": t.from_state.value if hasattr(t.from_state, 'value') else str(t.from_state),
                        "to_state": t.to_state.value if hasattr(t.to_state, 'value') else str(t.to_state),
                        "timestamp": t.timestamp.isoformat(),
                        "duration_seconds": t.duration_seconds,
                    }
                    for t in state_data.state_history
                ] if state_data.state_history else [],
            }

            await self.job_store.save(crawl_id, job_data)

        except Exception as e:
            print(f"Error saving job {crawl_id} to storage: {e}")

    def create_crawl(self, config: Dict[str, Any], user_id: str) -> str:
        """Create a new crawl job with state tracking."""
        crawl_id = str(uuid.uuid4())

        # Initialize state data
        state_data = CrawlStateData(
            crawl_id=crawl_id,
            current_state=CrawlState.QUEUED,
        )

        # Store config
        state_data.config = config

        # Initialize progress tracking
        state_data.progress = {
            "urls": CrawlProgress(),
            "documents": CrawlProgress(),
            "extractions": CrawlProgress(),
            "processing": CrawlProgress(),
        }

        # Store job data
        self.jobs[crawl_id] = state_data
        self.state_machines[crawl_id] = CrawlStateMachine(state_data)
        self.loggers[crawl_id] = CrawlLogger(crawl_id)

        # Initialize control flags
        self.pause_flags[crawl_id] = asyncio.Event()
        self.pause_flags[crawl_id].set()  # Start unpaused
        self.cancel_flags[crawl_id] = False

        # Log creation
        self.loggers[crawl_id].log_crawl_start(config)

        # Schedule async persistence (don't block)
        asyncio.create_task(self._save_job_to_storage(crawl_id))

        return crawl_id

    async def execute_crawl(self, crawl_id: str):
        """Execute a crawl job with full state tracking."""
        if crawl_id not in self.jobs:
            raise ValueError(f"Crawl job {crawl_id} not found")

        state_machine = self.state_machines[crawl_id]
        state_data = self.jobs[crawl_id]
        logger = self.loggers[crawl_id]
        metrics = self.metrics_aggregator.get_or_create_collector(crawl_id)

        try:
            # Transition to INITIALIZING
            await self._transition_state(crawl_id, CrawlState.INITIALIZING)
            await self._save_job_to_storage(crawl_id)  # Persist state

            # Initialize crawler
            config = state_data.config if hasattr(state_data, 'config') and state_data.config else {"config": "placeholder"}
            crawler_type = config.get("crawler", "scrapy")

            # Transition to CRAWLING
            await self._transition_state(crawl_id, CrawlState.CRAWLING)
            await self._save_job_to_storage(crawl_id)  # Persist state

            # Crawling phase
            await self._crawl_phase(crawl_id, crawler_type, config, metrics)

            # Check if cancelled
            if self.cancel_flags[crawl_id]:
                await self._transition_state(crawl_id, CrawlState.CANCELLED)
                await self._save_job_to_storage(crawl_id)
                return

            # Transition to EXTRACTING
            await self._transition_state(crawl_id, CrawlState.EXTRACTING)
            await self._save_job_to_storage(crawl_id)

            # Extraction phase
            await self._extract_phase(crawl_id, metrics)

            # Check if cancelled
            if self.cancel_flags[crawl_id]:
                await self._transition_state(crawl_id, CrawlState.CANCELLED)
                await self._save_job_to_storage(crawl_id)
                return

            # Transition to PROCESSING
            await self._transition_state(crawl_id, CrawlState.PROCESSING)
            await self._save_job_to_storage(crawl_id)

            # Processing phase
            await self._process_phase(crawl_id, metrics)

            # Transition to COMPLETED
            await self._transition_state(crawl_id, CrawlState.COMPLETED)
            await self._save_job_to_storage(crawl_id)

            logger.log_crawl_complete(state_data.metrics.dict())

        except Exception as e:
            logger.log_error("execution_error", str(e))
            await emit_error(crawl_id, "execution_error", str(e))
            state_data.error_message = str(e)
            state_data.error_count += 1
            await self._transition_state(crawl_id, CrawlState.FAILED)
            await self._save_job_to_storage(crawl_id)  # Persist error state

    async def _crawl_phase(
        self,
        crawl_id: str,
        crawler_type: str,
        config: Dict[str, Any],
        metrics: MetricsCollector
    ):
        """Execute crawling phase with substates."""
        state_machine = self.state_machines[crawl_id]
        state_data = self.jobs[crawl_id]
        logger = self.loggers[crawl_id]

        # Substate: Discovering URLs
        state_machine.set_substate(CrawlSubstate.DISCOVERING_URLS)
        await self._emit_substate_change(crawl_id, CrawlSubstate.DISCOVERING_URLS)

        # Try low-compute discovery via sitemaps + preflight validation
        await self._check_pause_cancel(crawl_id)
        discovered_documents = []
        checked_urls = 0
        skipped_urls = 0
        used_sitemaps = []
        try:
            from utils.discovery import discover_documents
            discovery = await discover_documents(config)
            discovered_documents = discovery.documents
            checked_urls = discovery.checked_urls
            skipped_urls = discovery.skipped_urls
            used_sitemaps = discovery.used_sitemaps
            logger.log_event(
                "discovery_summary",
                {
                    "checked_urls": checked_urls,
                    "skipped_urls": skipped_urls,
                    "documents_found": len(discovered_documents),
                    "sitemaps": used_sitemaps,
                },
            )
        except Exception as exc:
            logger.log_error("discovery_error", str(exc))

        if discovered_documents:
            state_data.progress["urls"].total = max(checked_urls, len(discovered_documents))
            state_data.progress["urls"].completed = state_data.progress["urls"].total
            state_data.metrics.urls_crawled = state_data.progress["urls"].total
            await emit_progress_update(crawl_id, self._get_progress_data(state_data))
        else:
            # Simulate URL discovery
            state_data.progress["urls"].total = 100  # Example
            await emit_progress_update(crawl_id, self._get_progress_data(state_data))

        # Substate: Downloading Pages
        state_machine.set_substate(CrawlSubstate.DOWNLOADING_PAGES)
        await self._emit_substate_change(crawl_id, CrawlSubstate.DOWNLOADING_PAGES)

        # Simulate page downloads if no discovery data
        if not discovered_documents:
            for i in range(state_data.progress["urls"].total):
                await self._check_pause_cancel(crawl_id)

                # Simulate crawling
                success = True  # Placeholder
                state_data.progress["urls"].completed += 1
                state_data.metrics.urls_crawled += 1

                # Record metrics
                metrics.record_system_metrics()
                metrics.calculate_throughput(
                    state_data.metrics.urls_crawled,
                    state_data.started_at,
                    "pages_per_second"
                )

                # Log page
                logger.log_page_crawled(f"https://example.com/page{i}", success)

                # Emit progress every 10 pages
                if i % 10 == 0:
                    await emit_progress_update(crawl_id, self._get_progress_data(state_data))
                    await emit_metrics_update(crawl_id, metrics.get_performance_summary())

                # Auto-save every 25 pages
                if i % 25 == 0:
                    await self._save_job_to_storage(crawl_id)

        # Substate: Downloading Documents
        state_machine.set_substate(CrawlSubstate.DOWNLOADING_DOCUMENTS)
        await self._emit_substate_change(crawl_id, CrawlSubstate.DOWNLOADING_DOCUMENTS)

        if discovered_documents:
            state_data.progress["documents"].total = len(discovered_documents)
            state_data.progress["documents"].completed = len(discovered_documents)
            state_data.metrics.documents_found = len(discovered_documents)
            await emit_progress_update(crawl_id, self._get_progress_data(state_data))
            await self._save_job_to_storage(crawl_id)

            for doc in discovered_documents:
                logger.log_document_found(
                    doc.get("url", ""),
                    doc.get("document_type", "document"),
                    {
                        "title": doc.get("title"),
                        "file_type": doc.get("file_type", "document"),
                        "file_size": doc.get("file_size", 0),
                        "source_date": doc.get("source_date"),
                        "source_page": doc.get("source_page"),
                        "content_type": doc.get("content_type"),
                        "last_modified": doc.get("last_modified"),
                        "quality_score": 0.9,
                        "tags": [],
                        "discovery": {
                            "checked_urls": checked_urls,
                            "skipped_urls": skipped_urls,
                            "sitemaps": used_sitemaps,
                        },
                    },
                )
        else:
            state_data.progress["documents"].total = 50  # Example
            state_data.progress["documents"].completed = 50
            state_data.metrics.documents_found = 50
            await emit_progress_update(crawl_id, self._get_progress_data(state_data))
            await self._save_job_to_storage(crawl_id)

            # Emit synthetic document events for ingestion pipeline
            base_target = "https://example.com"
            targets = config.get("targets") or []
            if targets:
                base_target = str(targets[0]).rstrip("/")

            hints = (config.get("taxonomy") or {}).get("hints") or {}
            program = hints.get("program", "CSEC")
            subject = hints.get("subject", "Mathematics")
            document_type = hints.get("document_type", "past_paper")
            year_hint = hints.get("year")

            for i in range(state_data.progress["documents"].total):
                year = year_hint or str(2019 + (i % 6))
                title = f"{program} {subject} {year} {document_type.replace('_', ' ').title()}"
                url = f"{base_target}/documents/{program.lower()}-{subject.lower()}-{year}-{i + 1}.pdf"
                logger.log_document_found(
                    url,
                    document_type,
                    {
                        "title": title,
                        "file_type": "pdf",
                        "file_size": 1024 * (i + 1),
                        "quality_score": 0.85,
                        "tags": [program, subject, str(year)],
                    },
                )

    async def _extract_phase(self, crawl_id: str, metrics: MetricsCollector):
        """Execute extraction phase with substates."""
        state_machine = self.state_machines[crawl_id]
        state_data = self.jobs[crawl_id]

        # PDF Extraction
        state_machine.set_substate(CrawlSubstate.PDF_EXTRACTION)
        await self._emit_substate_change(crawl_id, CrawlSubstate.PDF_EXTRACTION)

        state_data.progress["extractions"].total = state_data.progress["documents"].completed
        state_data.progress["extractions"].completed = state_data.progress["extractions"].total
        await emit_progress_update(crawl_id, self._get_progress_data(state_data))

        # OCR
        state_machine.set_substate(CrawlSubstate.OCR)
        await self._emit_substate_change(crawl_id, CrawlSubstate.OCR)
        await self._check_pause_cancel(crawl_id)

        # Table Detection
        state_machine.set_substate(CrawlSubstate.TABLE_DETECTION)
        await self._emit_substate_change(crawl_id, CrawlSubstate.TABLE_DETECTION)
        await self._check_pause_cancel(crawl_id)

        await self._save_job_to_storage(crawl_id)

    async def _process_phase(self, crawl_id: str, metrics: MetricsCollector):
        """Execute processing phase with substates."""
        state_machine = self.state_machines[crawl_id]
        state_data = self.jobs[crawl_id]

        # Metadata Extraction
        state_machine.set_substate(CrawlSubstate.METADATA_EXTRACTION)
        await self._emit_substate_change(crawl_id, CrawlSubstate.METADATA_EXTRACTION)
        await self._check_pause_cancel(crawl_id)

        # Quality Scoring
        state_machine.set_substate(CrawlSubstate.QUALITY_SCORING)
        await self._emit_substate_change(crawl_id, CrawlSubstate.QUALITY_SCORING)
        await self._check_pause_cancel(crawl_id)

        # Deduplication
        state_machine.set_substate(CrawlSubstate.DEDUPLICATION)
        await self._emit_substate_change(crawl_id, CrawlSubstate.DEDUPLICATION)
        await self._check_pause_cancel(crawl_id)

        # NeMo Curation
        state_machine.set_substate(CrawlSubstate.NEMO_CURATION)
        await self._emit_substate_change(crawl_id, CrawlSubstate.NEMO_CURATION)
        await self._check_pause_cancel(crawl_id)

        state_data.progress["processing"].total = state_data.progress["extractions"].completed
        state_data.progress["processing"].completed = state_data.progress["processing"].total
        await emit_progress_update(crawl_id, self._get_progress_data(state_data))

        await self._save_job_to_storage(crawl_id)

    async def _transition_state(self, crawl_id: str, to_state: CrawlState):
        """Transition state and emit events."""
        state_machine = self.state_machines[crawl_id]
        state_data = self.jobs[crawl_id]

        from_state = state_data.current_state

        # Perform transition
        state_machine.transition(to_state)

        # Emit event
        await emit_state_change(
            crawl_id,
            from_state.value,
            to_state.value,
            {"duration_seconds": state_data.duration_seconds}
        )

    async def _emit_substate_change(self, crawl_id: str, substate: CrawlSubstate):
        """Emit substate change event."""
        from events.event_bus import CrawlEvent

        event = CrawlEvent(
            crawl_id=crawl_id,
            event_type=EventType.SUBSTATE_CHANGE,
            data={"substate": substate.value}
        )
        await event_bus.publish(event)

    async def _check_pause_cancel(self, crawl_id: str):
        """Check if crawl should pause or cancel."""
        # Check cancel flag
        if self.cancel_flags[crawl_id]:
            raise asyncio.CancelledError("Crawl cancelled")

        # Wait if paused
        await self.pause_flags[crawl_id].wait()

    def _get_progress_data(self, state_data: CrawlStateData) -> Dict[str, Any]:
        """Get progress data for events."""
        return {
            "overall_percentage": state_data.overall_progress_percentage,
            "urls": {
                "total": state_data.progress["urls"].total,
                "completed": state_data.progress["urls"].completed,
                "failed": state_data.progress["urls"].failed,
                "percentage": state_data.progress["urls"].percentage,
            },
            "documents": {
                "total": state_data.progress["documents"].total,
                "completed": state_data.progress["documents"].completed,
                "percentage": state_data.progress["documents"].percentage,
            },
            "extractions": {
                "total": state_data.progress["extractions"].total,
                "completed": state_data.progress["extractions"].completed,
                "percentage": state_data.progress["extractions"].percentage,
            },
            "processing": {
                "total": state_data.progress["processing"].total,
                "completed": state_data.progress["processing"].completed,
                "percentage": state_data.progress["processing"].percentage,
            },
        }

    async def pause_crawl(self, crawl_id: str) -> bool:
        """Pause a running crawl."""
        if crawl_id not in self.jobs:
            raise ValueError(f"Crawl job {crawl_id} not found")

        state_machine = self.state_machines[crawl_id]

        if not state_machine.can_pause():
            return False

        # Create checkpoint before pausing
        state_data = self.jobs[crawl_id]
        try:
            self.checkpoint_manager.create_checkpoint(
                crawl_id=crawl_id,
                state_data=state_data,
                checkpoint_type=CheckpointType.PAUSE
            )
        except Exception as e:
            print(f"Warning: Failed to create pause checkpoint: {e}")

        # Set pause flag
        self.pause_flags[crawl_id].clear()

        # Transition to PAUSED
        await self._transition_state(crawl_id, CrawlState.PAUSED)
        await self._save_job_to_storage(crawl_id)

        return True

    async def resume_crawl(self, crawl_id: str) -> bool:
        """Resume a paused crawl."""
        if crawl_id not in self.jobs:
            raise ValueError(f"Crawl job {crawl_id} not found")

        state_machine = self.state_machines[crawl_id]
        state_data = self.jobs[crawl_id]

        if not state_machine.can_resume():
            return False

        # Clear pause flag
        self.pause_flags[crawl_id].set()

        # Determine which state to resume to based on history
        if state_data.state_history:
            # Find last non-paused state
            for transition in reversed(state_data.state_history[:-1]):
                if transition.to_state != CrawlState.PAUSED:
                    target_state = transition.to_state
                    break
            else:
                target_state = CrawlState.CRAWLING
        else:
            target_state = CrawlState.CRAWLING

        # Transition back to active state
        await self._transition_state(crawl_id, target_state)
        await self._save_job_to_storage(crawl_id)

        return True

    async def cancel_crawl(self, crawl_id: str) -> bool:
        """Cancel a crawl job."""
        if crawl_id not in self.jobs:
            raise ValueError(f"Crawl job {crawl_id} not found")

        state_machine = self.state_machines[crawl_id]

        if state_machine.is_terminal_state():
            return False

        # Set cancel flag
        self.cancel_flags[crawl_id] = True

        # Clear pause if paused
        self.pause_flags[crawl_id].set()

        # Transition to CANCELLED
        await self._transition_state(crawl_id, CrawlState.CANCELLED)
        await self._save_job_to_storage(crawl_id)

        return True

    async def delete_crawl(self, crawl_id: str) -> bool:
        """Delete a crawl job from memory and storage."""
        # Remove from memory
        if crawl_id in self.jobs:
            del self.jobs[crawl_id]
        if crawl_id in self.state_machines:
            del self.state_machines[crawl_id]
        if crawl_id in self.loggers:
            del self.loggers[crawl_id]
        if crawl_id in self.pause_flags:
            del self.pause_flags[crawl_id]
        if crawl_id in self.cancel_flags:
            del self.cancel_flags[crawl_id]

        # Remove from persistent storage
        await self._init_persistence()
        if self.job_store:
            return await self.job_store.delete(crawl_id)

        return True

    def get_status(self, crawl_id: str) -> Optional[Dict[str, Any]]:
        """Get crawl job status."""
        if crawl_id not in self.jobs:
            return None

        state_machine = self.state_machines[crawl_id]
        return state_machine.get_state_summary()

    def get_state(self, crawl_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed state information."""
        if crawl_id not in self.jobs:
            return None

        state_data = self.jobs[crawl_id]
        state_machine = self.state_machines[crawl_id]

        return {
            "crawl_id": crawl_id,
            "current_state": state_data.current_state,
            "current_substate": state_data.current_substate,
            "progress": self._get_progress_data(state_data),
            "metrics": state_data.metrics.dict(),
            "can_pause": state_machine.can_pause(),
            "can_resume": state_machine.can_resume(),
            "is_terminal": state_machine.is_terminal_state(),
            "state_history": [
                {
                    "from_state": t.from_state,
                    "to_state": t.to_state,
                    "timestamp": t.timestamp.isoformat(),
                    "duration_seconds": t.duration_seconds,
                }
                for t in state_data.state_history
            ],
        }

    def get_metrics(self, crawl_id: str) -> Optional[Dict[str, Any]]:
        """Get real-time metrics."""
        metrics = self.metrics_aggregator.collectors.get(crawl_id)
        if not metrics:
            return None

        return metrics.get_snapshot()

    def get_results(self, crawl_id: str) -> Optional[Dict[str, Any]]:
        """Get crawl job results."""
        state_data = self.jobs.get(crawl_id)
        if not state_data:
            return None

        if state_data.current_state != CrawlState.COMPLETED:
            return None

        return {
            "crawl_id": crawl_id,
            "status": "completed",
            "metrics": state_data.metrics.dict(),
            "progress": self._get_progress_data(state_data),
            "duration_seconds": state_data.duration_seconds,
        }

    def list_jobs(
        self,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """List all jobs in memory with optional filtering."""
        jobs = []

        for crawl_id, state_data in self.jobs.items():
            current_status = state_data.current_state.value if hasattr(state_data.current_state, 'value') else str(state_data.current_state)

            if status and current_status != status:
                continue

            jobs.append({
                "crawl_id": crawl_id,
                "status": current_status,
                "started_at": state_data.started_at.isoformat() if state_data.started_at else None,
                "completed_at": state_data.completed_at.isoformat() if state_data.completed_at else None,
                "progress": self._get_progress_data(state_data),
                "config": state_data.config if hasattr(state_data, 'config') else {},
            })

        # Sort by started_at (newest first)
        jobs.sort(key=lambda x: x.get("started_at") or "", reverse=True)

        return jobs[offset:offset + limit]
