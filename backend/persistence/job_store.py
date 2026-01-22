"""
Job Persistence Store

Provides persistent storage for crawl jobs using JSON files.
Jobs survive backend restarts and can be queried/filtered.

Features:
- Save/load jobs to JSON files
- Index for fast lookups
- Status filtering
- Pagination support
- Auto-backup
- Thread-safe operations
"""

from typing import List, Optional, Dict, Any
from pathlib import Path
import json
import os
from datetime import datetime
import threading
import shutil
from enum import Enum


class JobStatus(str, Enum):
    """Job status values for filtering."""
    QUEUED = "queued"
    INITIALIZING = "initializing"
    CRAWLING = "crawling"
    EXTRACTING = "extracting"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class JSONJobStore:
    """
    JSON file-based job storage with index for fast lookups.

    Directory structure:
        data/jobs/
            index.json          - Job index with metadata
            {crawl_id}.json     - Individual job files
            backups/            - Automatic backups
    """

    def __init__(self, storage_dir: str = "data/jobs"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)

        # Backup directory
        self.backup_dir = self.storage_dir / "backups"
        self.backup_dir.mkdir(parents=True, exist_ok=True)

        # Index file
        self.index_file = self.storage_dir / "index.json"

        # Thread lock for concurrent access
        self._lock = threading.RLock()

        # Load or create index
        self._load_index()

    def _load_index(self):
        """Load job index from file."""
        with self._lock:
            if self.index_file.exists():
                try:
                    with open(self.index_file, 'r') as f:
                        self.index = json.load(f)
                except json.JSONDecodeError:
                    print(f"Warning: Corrupted index file, creating new one")
                    self.index = {"jobs": {}, "last_updated": None, "version": 1}
            else:
                self.index = {"jobs": {}, "last_updated": None, "version": 1}

    def _save_index(self):
        """Save job index to file."""
        with self._lock:
            self.index["last_updated"] = datetime.utcnow().isoformat()

            # Write to temp file first, then rename (atomic operation)
            temp_file = self.index_file.with_suffix('.tmp')
            with open(temp_file, 'w') as f:
                json.dump(self.index, f, indent=2, default=str)

            # Atomic rename
            temp_file.replace(self.index_file)

    def _serialize_value(self, value: Any) -> Any:
        """Serialize values for JSON storage."""
        if isinstance(value, datetime):
            return value.isoformat()
        elif isinstance(value, Enum):
            return value.value
        elif hasattr(value, 'dict'):
            return value.dict()
        elif hasattr(value, '__dict__'):
            return self._serialize_dict(value.__dict__)
        elif isinstance(value, dict):
            return self._serialize_dict(value)
        elif isinstance(value, list):
            return [self._serialize_value(v) for v in value]
        return value

    def _serialize_dict(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively serialize a dictionary."""
        result = {}
        for key, value in data.items():
            if key.startswith('_'):  # Skip private attributes
                continue
            result[key] = self._serialize_value(value)
        return result

    async def save(self, crawl_id: str, data: Dict[str, Any]) -> bool:
        """
        Save job data to persistent storage.

        Args:
            crawl_id: Unique identifier for the crawl job
            data: Job data dictionary (can be CrawlStateData or dict)

        Returns:
            True if successful, False otherwise
        """
        with self._lock:
            try:
                job_file = self.storage_dir / f"{crawl_id}.json"

                # Serialize data
                serialized = self._serialize_dict(data) if isinstance(data, dict) else self._serialize_value(data)

                # Add metadata
                serialized["_saved_at"] = datetime.utcnow().isoformat()
                serialized["_version"] = 1

                # Write to temp file first
                temp_file = job_file.with_suffix('.tmp')
                with open(temp_file, 'w') as f:
                    json.dump(serialized, f, indent=2, default=str)

                # Atomic rename
                temp_file.replace(job_file)

                # Extract status for index
                status = "unknown"
                if "current_state" in serialized:
                    state = serialized["current_state"]
                    if isinstance(state, dict):
                        status = state.get("value", "unknown")
                    else:
                        status = str(state)
                elif "status" in serialized:
                    status = serialized.get("status", "unknown")

                # Extract query for index
                query = ""
                if "config" in serialized and isinstance(serialized["config"], dict):
                    query = serialized["config"].get("original_query", "")

                # Extract created_at
                created_at = serialized.get("created_at") or serialized.get("started_at") or datetime.utcnow().isoformat()

                # Update index
                self.index["jobs"][crawl_id] = {
                    "status": status,
                    "created_at": created_at,
                    "updated_at": datetime.utcnow().isoformat(),
                    "query": query[:200] if query else "",  # Truncate for index
                    "file": str(job_file),
                    "file_size": job_file.stat().st_size,
                }
                self._save_index()

                return True

            except Exception as e:
                print(f"Error saving job {crawl_id}: {e}")
                return False

    async def load(self, crawl_id: str) -> Optional[Dict[str, Any]]:
        """
        Load job data from storage.

        Args:
            crawl_id: Unique identifier for the crawl job

        Returns:
            Job data dictionary or None if not found
        """
        with self._lock:
            job_file = self.storage_dir / f"{crawl_id}.json"

            if not job_file.exists():
                return None

            try:
                with open(job_file, 'r') as f:
                    data = json.load(f)
                return data
            except json.JSONDecodeError as e:
                print(f"Error loading job {crawl_id}: {e}")
                return None

    async def list(
        self,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> List[Dict[str, Any]]:
        """
        List jobs with filtering, pagination, and sorting.

        Args:
            status: Filter by job status
            limit: Maximum number of results
            offset: Number of results to skip
            search: Search in query text
            sort_by: Field to sort by
            sort_order: 'asc' or 'desc'

        Returns:
            List of job metadata dictionaries
        """
        with self._lock:
            jobs = []

            for crawl_id, job_meta in self.index["jobs"].items():
                job_meta = {**job_meta, "crawl_id": crawl_id}

                # Filter by status
                if status and job_meta.get("status") != status:
                    continue

                # Filter by search
                if search:
                    query = job_meta.get("query", "").lower()
                    if search.lower() not in query:
                        continue

                jobs.append(job_meta)

            # Sort
            reverse = sort_order.lower() == "desc"
            jobs.sort(key=lambda x: x.get(sort_by, ""), reverse=reverse)

            # Paginate
            return jobs[offset:offset + limit]

    async def delete(self, crawl_id: str) -> bool:
        """
        Delete job from storage.

        Args:
            crawl_id: Unique identifier for the crawl job

        Returns:
            True if deleted, False if not found
        """
        with self._lock:
            job_file = self.storage_dir / f"{crawl_id}.json"

            # Backup before delete
            if job_file.exists():
                backup_file = self.backup_dir / f"{crawl_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
                shutil.copy2(job_file, backup_file)
                job_file.unlink()

            # Remove from index
            if crawl_id in self.index["jobs"]:
                del self.index["jobs"][crawl_id]
                self._save_index()
                return True

            return False

    async def get_stats(self) -> Dict[str, Any]:
        """
        Get storage statistics.

        Returns:
            Dictionary with storage stats
        """
        with self._lock:
            total = len(self.index["jobs"])

            status_counts = {}
            for job_meta in self.index["jobs"].values():
                status = job_meta.get("status", "unknown")
                status_counts[status] = status_counts.get(status, 0) + 1

            # Calculate total storage size
            total_size = sum(
                job_meta.get("file_size", 0)
                for job_meta in self.index["jobs"].values()
            )

            return {
                "total_jobs": total,
                "status_counts": status_counts,
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "index_size": len(json.dumps(self.index)),
                "last_updated": self.index.get("last_updated"),
            }

    async def exists(self, crawl_id: str) -> bool:
        """Check if a job exists."""
        with self._lock:
            return crawl_id in self.index["jobs"]

    async def get_all_ids(self) -> List[str]:
        """Get all job IDs."""
        with self._lock:
            return list(self.index["jobs"].keys())

    async def bulk_load(self, crawl_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        """Load multiple jobs at once."""
        results = {}
        for crawl_id in crawl_ids:
            data = await self.load(crawl_id)
            if data:
                results[crawl_id] = data
        return results

    def rebuild_index(self):
        """Rebuild index from job files (for recovery)."""
        with self._lock:
            self.index = {"jobs": {}, "last_updated": None, "version": 1}

            for job_file in self.storage_dir.glob("*.json"):
                if job_file.name in ["index.json"]:
                    continue

                try:
                    with open(job_file, 'r') as f:
                        data = json.load(f)

                    crawl_id = job_file.stem

                    # Extract metadata for index
                    status = "unknown"
                    if "current_state" in data:
                        state = data["current_state"]
                        if isinstance(state, dict):
                            status = state.get("value", "unknown")
                        else:
                            status = str(state)
                    elif "status" in data:
                        status = data.get("status", "unknown")

                    query = ""
                    if "config" in data and isinstance(data["config"], dict):
                        query = data["config"].get("original_query", "")

                    created_at = data.get("created_at") or data.get("started_at") or data.get("_saved_at")

                    self.index["jobs"][crawl_id] = {
                        "status": status,
                        "created_at": created_at,
                        "updated_at": data.get("_saved_at"),
                        "query": query[:200] if query else "",
                        "file": str(job_file),
                        "file_size": job_file.stat().st_size,
                    }

                except Exception as e:
                    print(f"Error rebuilding index for {job_file}: {e}")

            self._save_index()
            print(f"Index rebuilt with {len(self.index['jobs'])} jobs")


# Singleton instance
job_store = JSONJobStore()
