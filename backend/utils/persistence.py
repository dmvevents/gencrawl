"""Job persistence utilities for saving/loading crawl jobs."""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Optional, List
import os


class JobPersistence:
    """Handles saving and loading crawl jobs to/from JSON files."""

    def __init__(self, data_dir: str = None):
        if data_dir is None:
            # Default to data/jobs relative to backend directory
            backend_dir = Path(__file__).parent.parent
            data_dir = backend_dir.parent / "data" / "jobs"

        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

    def _get_job_path(self, crawl_id: str) -> Path:
        """Get the path for a job file."""
        return self.data_dir / f"{crawl_id}.json"

    def save_job(self, crawl_id: str, job_data: Dict[str, Any]) -> bool:
        """Save a job to a JSON file."""
        try:
            job_path = self._get_job_path(crawl_id)

            # Convert datetime objects to ISO strings
            serializable_data = self._make_serializable(job_data)

            # Add metadata
            serializable_data["_meta"] = {
                "saved_at": datetime.utcnow().isoformat(),
                "version": "1.0"
            }

            with open(job_path, 'w') as f:
                json.dump(serializable_data, f, indent=2)

            return True
        except Exception as e:
            print(f"Error saving job {crawl_id}: {e}")
            return False

    def load_job(self, crawl_id: str) -> Optional[Dict[str, Any]]:
        """Load a job from a JSON file."""
        try:
            job_path = self._get_job_path(crawl_id)

            if not job_path.exists():
                return None

            with open(job_path, 'r') as f:
                data = json.load(f)

            # Remove metadata
            data.pop("_meta", None)

            return data
        except Exception as e:
            print(f"Error loading job {crawl_id}: {e}")
            return None

    def delete_job(self, crawl_id: str) -> bool:
        """Delete a job file."""
        try:
            job_path = self._get_job_path(crawl_id)

            if job_path.exists():
                job_path.unlink()
                return True

            return False
        except Exception as e:
            print(f"Error deleting job {crawl_id}: {e}")
            return False

    def list_jobs(self) -> List[str]:
        """List all saved job IDs."""
        try:
            return [
                f.stem for f in self.data_dir.glob("*.json")
                if not f.name.startswith("_")
            ]
        except Exception as e:
            print(f"Error listing jobs: {e}")
            return []

    def load_all_jobs(self) -> Dict[str, Dict[str, Any]]:
        """Load all jobs from files."""
        jobs = {}
        for job_id in self.list_jobs():
            job_data = self.load_job(job_id)
            if job_data:
                jobs[job_id] = job_data
        return jobs

    def _make_serializable(self, obj: Any) -> Any:
        """Convert an object to be JSON serializable."""
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, dict):
            return {k: self._make_serializable(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._make_serializable(item) for item in obj]
        elif hasattr(obj, 'dict'):
            # Handle Pydantic models
            return self._make_serializable(obj.dict())
        elif hasattr(obj, 'value'):
            # Handle Enums
            return obj.value
        else:
            return obj


# Create singleton instance
job_persistence = JobPersistence()
