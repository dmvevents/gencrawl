"""
Iteration Manager - Multi-Iteration Crawling and Incremental Updates

Manages:
- Multiple iterations of the same crawl
- Parent-child iteration linking
- Iteration comparison (what's new, changed, unchanged)
- Incremental crawling (only fetch new/modified content)
- Change detection (content hash, last-modified, etag)
"""

from typing import Dict, Any, Optional, List, Set
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum
import hashlib
import json
from pathlib import Path


class IterationMode(str, Enum):
    """Iteration modes."""
    BASELINE = "baseline"  # Full crawl, establishes baseline
    INCREMENTAL = "incremental"  # Only fetch new/modified content
    FULL = "full"  # Full crawl, but compare with previous


class ChangeType(str, Enum):
    """Types of changes detected."""
    NEW = "new"  # Document didn't exist before
    MODIFIED = "modified"  # Document exists but content changed
    UNCHANGED = "unchanged"  # Document exists and content same
    DELETED = "deleted"  # Document existed before but not found now


class DocumentFingerprint(BaseModel):
    """Fingerprint for a document to detect changes."""
    url: str
    content_hash: str  # SHA-256 hash of content
    last_modified: Optional[str] = None  # HTTP Last-Modified header
    etag: Optional[str] = None  # HTTP ETag header
    file_size: Optional[int] = None
    crawled_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class IterationComparison(BaseModel):
    """Comparison between two iterations."""
    baseline_iteration_id: str
    current_iteration_id: str
    new_documents: List[str] = []  # URLs
    modified_documents: List[str] = []
    unchanged_documents: List[str] = []
    deleted_documents: List[str] = []

    @property
    def total_changes(self) -> int:
        """Total number of changes."""
        return len(self.new_documents) + len(self.modified_documents) + len(self.deleted_documents)

    @property
    def has_changes(self) -> bool:
        """Check if there are any changes."""
        return self.total_changes > 0


class IterationMetadata(BaseModel):
    """Metadata for a crawl iteration."""
    iteration_id: str
    crawl_id: str  # Base crawl ID (same across iterations)
    iteration_number: int  # 0 = baseline, 1, 2, 3...
    parent_iteration_id: Optional[str] = None  # Link to previous iteration
    baseline_iteration_id: Optional[str] = None  # Link to baseline (iteration 0)

    mode: IterationMode = IterationMode.BASELINE

    # Timestamps
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

    # Configuration
    config: Dict[str, Any] = Field(default_factory=dict)

    # Statistics
    stats: Dict[str, Any] = Field(default_factory=lambda: {
        "new_documents": 0,
        "modified_documents": 0,
        "unchanged_documents": 0,
        "deleted_documents": 0,
        "total_documents": 0,
        "urls_crawled": 0,
        "urls_failed": 0,
    })

    # Storage paths
    output_dir: Optional[str] = None
    fingerprints_file: Optional[str] = None

    @property
    def duration_seconds(self) -> Optional[float]:
        """Calculate iteration duration."""
        if not self.completed_at:
            return None
        return (self.completed_at - self.started_at).total_seconds()


class IterationManager:
    """Manages multiple iterations of crawls."""

    def __init__(self, storage_dir: Path = None):
        """Initialize iteration manager."""
        if storage_dir is None:
            storage_dir = Path(__file__).parent.parent.parent / "data" / "iterations"

        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

        # In-memory storage
        self.iterations: Dict[str, IterationMetadata] = {}
        self.fingerprints: Dict[str, Dict[str, DocumentFingerprint]] = {}  # iteration_id -> {url -> fingerprint}

        # Load existing iterations
        self._load_iterations()

    def create_iteration(
        self,
        crawl_id: str,
        config: Dict[str, Any],
        mode: IterationMode = IterationMode.BASELINE
    ) -> str:
        """Create a new iteration."""
        # Find existing iterations for this crawl
        existing = self._get_iterations_for_crawl(crawl_id)

        iteration_number = len(existing)

        # Generate iteration ID
        iteration_id = f"{crawl_id}_iter_{iteration_number}"

        # Determine parent and baseline
        parent_iteration_id = None
        baseline_iteration_id = None

        if existing:
            # Parent is the most recent iteration
            parent_iteration_id = existing[-1].iteration_id
            # Baseline is always iteration 0
            baseline_iteration_id = existing[0].iteration_id

        # Create metadata
        metadata = IterationMetadata(
            iteration_id=iteration_id,
            crawl_id=crawl_id,
            iteration_number=iteration_number,
            parent_iteration_id=parent_iteration_id,
            baseline_iteration_id=baseline_iteration_id,
            mode=mode,
            config=config,
            output_dir=str(self.storage_dir / iteration_id),
        )

        # Create output directory
        Path(metadata.output_dir).mkdir(parents=True, exist_ok=True)
        metadata.fingerprints_file = str(Path(metadata.output_dir) / "fingerprints.json")

        # Store
        self.iterations[iteration_id] = metadata
        self.fingerprints[iteration_id] = {}

        # Save to disk
        self._save_iteration(metadata)

        return iteration_id

    def get_iteration(self, iteration_id: str) -> Optional[IterationMetadata]:
        """Get iteration metadata."""
        return self.iterations.get(iteration_id)

    def get_iterations_for_crawl(self, crawl_id: str) -> List[IterationMetadata]:
        """Get all iterations for a crawl, sorted by iteration number."""
        return self._get_iterations_for_crawl(crawl_id)

    def _get_iterations_for_crawl(self, crawl_id: str) -> List[IterationMetadata]:
        """Internal method to get iterations."""
        iterations = [
            meta for meta in self.iterations.values()
            if meta.crawl_id == crawl_id
        ]
        iterations.sort(key=lambda x: x.iteration_number)
        return iterations

    def should_crawl_url(
        self,
        iteration_id: str,
        url: str,
        current_etag: Optional[str] = None,
        current_last_modified: Optional[str] = None
    ) -> tuple[bool, Optional[ChangeType]]:
        """
        Determine if a URL should be crawled based on iteration mode and change detection.

        Returns:
            (should_crawl, change_type)
        """
        metadata = self.iterations.get(iteration_id)
        if not metadata:
            return True, None

        # Baseline or full mode: always crawl
        if metadata.mode in [IterationMode.BASELINE, IterationMode.FULL]:
            return True, ChangeType.NEW

        # Incremental mode: check if changed
        if metadata.mode == IterationMode.INCREMENTAL:
            if not metadata.parent_iteration_id:
                # No parent, treat as baseline
                return True, ChangeType.NEW

            parent_fingerprints = self.fingerprints.get(metadata.parent_iteration_id, {})
            parent_fp = parent_fingerprints.get(url)

            if not parent_fp:
                # New URL
                return True, ChangeType.NEW

            # Check ETag
            if current_etag and parent_fp.etag:
                if current_etag == parent_fp.etag:
                    return False, ChangeType.UNCHANGED
                else:
                    return True, ChangeType.MODIFIED

            # Check Last-Modified
            if current_last_modified and parent_fp.last_modified:
                if current_last_modified == parent_fp.last_modified:
                    return False, ChangeType.UNCHANGED
                else:
                    return True, ChangeType.MODIFIED

            # If no headers available, we need to download to compare hash
            # Return True but mark as potentially modified
            return True, ChangeType.MODIFIED

        return True, None

    def record_document(
        self,
        iteration_id: str,
        url: str,
        content: bytes,
        etag: Optional[str] = None,
        last_modified: Optional[str] = None,
        metadata: Dict[str, Any] = None
    ) -> DocumentFingerprint:
        """
        Record a document fingerprint for change tracking.

        Args:
            iteration_id: Current iteration ID
            url: Document URL
            content: Document content (for hashing)
            etag: HTTP ETag header
            last_modified: HTTP Last-Modified header
            metadata: Additional metadata

        Returns:
            DocumentFingerprint
        """
        # Calculate content hash
        content_hash = hashlib.sha256(content).hexdigest()

        # Create fingerprint
        fingerprint = DocumentFingerprint(
            url=url,
            content_hash=content_hash,
            etag=etag,
            last_modified=last_modified,
            file_size=len(content),
            metadata=metadata or {}
        )

        # Store
        if iteration_id not in self.fingerprints:
            self.fingerprints[iteration_id] = {}

        self.fingerprints[iteration_id][url] = fingerprint

        return fingerprint

    def detect_change(
        self,
        iteration_id: str,
        url: str,
        content: bytes,
        etag: Optional[str] = None,
        last_modified: Optional[str] = None
    ) -> ChangeType:
        """
        Detect what type of change occurred for a document.

        Args:
            iteration_id: Current iteration ID
            url: Document URL
            content: Document content
            etag: HTTP ETag header
            last_modified: HTTP Last-Modified header

        Returns:
            ChangeType (NEW, MODIFIED, UNCHANGED)
        """
        metadata = self.iterations.get(iteration_id)
        if not metadata or not metadata.parent_iteration_id:
            return ChangeType.NEW

        parent_fingerprints = self.fingerprints.get(metadata.parent_iteration_id, {})
        parent_fp = parent_fingerprints.get(url)

        if not parent_fp:
            return ChangeType.NEW

        # Calculate current hash
        current_hash = hashlib.sha256(content).hexdigest()

        # Compare hashes (most reliable)
        if current_hash == parent_fp.content_hash:
            return ChangeType.UNCHANGED
        else:
            return ChangeType.MODIFIED

    def compare_iterations(
        self,
        baseline_iteration_id: str,
        current_iteration_id: str
    ) -> IterationComparison:
        """
        Compare two iterations to identify changes.

        Args:
            baseline_iteration_id: Previous iteration
            current_iteration_id: Current iteration

        Returns:
            IterationComparison with detailed diff
        """
        baseline_fps = self.fingerprints.get(baseline_iteration_id, {})
        current_fps = self.fingerprints.get(current_iteration_id, {})

        baseline_urls = set(baseline_fps.keys())
        current_urls = set(current_fps.keys())

        comparison = IterationComparison(
            baseline_iteration_id=baseline_iteration_id,
            current_iteration_id=current_iteration_id
        )

        # New documents (in current but not in baseline)
        comparison.new_documents = list(current_urls - baseline_urls)

        # Deleted documents (in baseline but not in current)
        comparison.deleted_documents = list(baseline_urls - current_urls)

        # Check common documents for modifications
        common_urls = baseline_urls & current_urls
        for url in common_urls:
            baseline_fp = baseline_fps[url]
            current_fp = current_fps[url]

            if baseline_fp.content_hash == current_fp.content_hash:
                comparison.unchanged_documents.append(url)
            else:
                comparison.modified_documents.append(url)

        return comparison

    def complete_iteration(
        self,
        iteration_id: str,
        stats: Dict[str, Any] = None
    ):
        """Mark iteration as completed and save fingerprints."""
        metadata = self.iterations.get(iteration_id)
        if not metadata:
            raise ValueError(f"Iteration {iteration_id} not found")

        metadata.completed_at = datetime.utcnow()

        if stats:
            metadata.stats.update(stats)

        # Save fingerprints to disk
        self._save_fingerprints(iteration_id)

        # Save metadata
        self._save_iteration(metadata)

    def _save_iteration(self, metadata: IterationMetadata):
        """Save iteration metadata to disk."""
        metadata_file = self.storage_dir / f"{metadata.iteration_id}_metadata.json"
        with open(metadata_file, 'w') as f:
            json.dump(metadata.dict(), f, indent=2, default=str)

    def _save_fingerprints(self, iteration_id: str):
        """Save fingerprints to disk."""
        metadata = self.iterations.get(iteration_id)
        if not metadata or not metadata.fingerprints_file:
            return

        fingerprints = self.fingerprints.get(iteration_id, {})

        # Convert to serializable format
        serializable = {
            url: fp.dict() for url, fp in fingerprints.items()
        }

        with open(metadata.fingerprints_file, 'w') as f:
            json.dump(serializable, f, indent=2, default=str)

    def _load_iterations(self):
        """Load existing iterations from disk."""
        if not self.storage_dir.exists():
            return

        for metadata_file in self.storage_dir.glob("*_metadata.json"):
            try:
                with open(metadata_file, 'r') as f:
                    data = json.load(f)
                    metadata = IterationMetadata(**data)
                    self.iterations[metadata.iteration_id] = metadata

                    # Load fingerprints if available
                    if metadata.fingerprints_file and Path(metadata.fingerprints_file).exists():
                        with open(metadata.fingerprints_file, 'r') as fp_file:
                            fp_data = json.load(fp_file)
                            self.fingerprints[metadata.iteration_id] = {
                                url: DocumentFingerprint(**fp)
                                for url, fp in fp_data.items()
                            }
            except Exception as e:
                print(f"Error loading iteration from {metadata_file}: {e}")

    def get_iteration_chain(self, iteration_id: str) -> List[IterationMetadata]:
        """Get the full chain of iterations from baseline to current."""
        metadata = self.iterations.get(iteration_id)
        if not metadata:
            return []

        chain = []
        current = metadata

        # Go backwards to baseline
        while current:
            chain.insert(0, current)
            if current.parent_iteration_id:
                current = self.iterations.get(current.parent_iteration_id)
            else:
                break

        return chain

    def get_statistics(self, iteration_id: str) -> Dict[str, Any]:
        """Get comprehensive statistics for an iteration."""
        metadata = self.iterations.get(iteration_id)
        if not metadata:
            return {}

        stats = {
            "iteration_id": iteration_id,
            "iteration_number": metadata.iteration_number,
            "mode": metadata.mode,
            "started_at": metadata.started_at.isoformat(),
            "completed_at": metadata.completed_at.isoformat() if metadata.completed_at else None,
            "duration_seconds": metadata.duration_seconds,
            "stats": metadata.stats,
        }

        # Add comparison with parent if available
        if metadata.parent_iteration_id and metadata.completed_at:
            comparison = self.compare_iterations(
                metadata.parent_iteration_id,
                iteration_id
            )
            stats["comparison"] = {
                "new_documents": len(comparison.new_documents),
                "modified_documents": len(comparison.modified_documents),
                "unchanged_documents": len(comparison.unchanged_documents),
                "deleted_documents": len(comparison.deleted_documents),
                "total_changes": comparison.total_changes,
                "has_changes": comparison.has_changes,
            }

        return stats
