import logging
import sys
from datetime import datetime
import json
from pathlib import Path
from typing import Optional, Union

from utils.paths import get_log_dir

class CrawlLogger:
    """Enhanced logging for crawl monitoring."""

    def __init__(self, crawl_id: str, log_dir: Optional[Union[str, Path]] = None):
        self.crawl_id = crawl_id
        self.log_dir = Path(log_dir) if log_dir else get_log_dir()
        self.log_dir.mkdir(exist_ok=True, parents=True)

        # Create log file for this crawl
        self.log_file = self.log_dir / f"crawl_{crawl_id}.log"

        # Set up logger
        self.logger = logging.getLogger(f"gencrawl.{crawl_id}")
        self.logger.setLevel(logging.DEBUG)

        # File handler
        file_handler = logging.FileHandler(self.log_file)
        file_handler.setLevel(logging.DEBUG)

        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)

        # Formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)

        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)

        # Event log (structured JSON)
        self.event_log_file = self.log_dir / f"crawl_{crawl_id}_events.jsonl"

    def log_event(self, event_type: str, data: dict):
        """Log structured event to JSONL."""
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "crawl_id": self.crawl_id,
            "event_type": event_type,
            "data": data
        }

        with open(self.event_log_file, 'a') as f:
            f.write(json.dumps(event) + '\n')

    def log_crawl_start(self, config: dict):
        """Log crawl start."""
        self.logger.info(f"Starting crawl {self.crawl_id}")
        self.log_event("crawl_start", {
            "config": config,
            "targets": config.get("targets", []),
            "crawler": config.get("crawler"),
            "strategy": config.get("strategy")
        })

    def log_page_crawled(self, url: str, success: bool, metadata: dict = None):
        """Log page crawl result."""
        status = "success" if success else "failed"
        self.logger.info(f"Crawled {url}: {status}")
        self.log_event("page_crawled", {
            "url": url,
            "success": success,
            "metadata": metadata or {}
        })

    def log_document_found(self, url: str, doc_type: str, metadata: dict):
        """Log document discovery."""
        metadata = metadata or {}
        self.logger.info(f"Found document: {doc_type} at {url}")
        self.log_event("document_found", {
            "url": url,
            "document_type": doc_type,
            "title": metadata.get("title"),
            "file_type": metadata.get("file_type"),
            "file_size": metadata.get("file_size", 0),
            "quality_score": metadata.get("quality_score", 0.0),
            "tags": metadata.get("tags", []),
            "source_date": metadata.get("source_date"),
            "source_page": metadata.get("source_page"),
            "metadata": metadata
        })

    def log_extraction(self, file_path: str, extraction_method: str, success: bool):
        """Log content extraction."""
        status = "success" if success else "failed"
        self.logger.info(f"Extracted {file_path} with {extraction_method}: {status}")
        self.log_event("extraction", {
            "file_path": file_path,
            "method": extraction_method,
            "success": success
        })

    def log_quality_check(self, doc_id: str, quality_score: float, passed: bool):
        """Log quality assessment."""
        self.logger.info(f"Quality check for {doc_id}: {quality_score:.2f} ({'PASS' if passed else 'FAIL'})")
        self.log_event("quality_check", {
            "doc_id": doc_id,
            "quality_score": quality_score,
            "passed": passed
        })

    def log_error(self, error_type: str, error_message: str, context: dict = None):
        """Log error with context."""
        self.logger.error(f"{error_type}: {error_message}")
        self.log_event("error", {
            "error_type": error_type,
            "message": error_message,
            "context": context or {}
        })

    def log_crawl_complete(self, stats: dict):
        """Log crawl completion."""
        self.logger.info(f"Crawl {self.crawl_id} completed. Stats: {stats}")
        self.log_event("crawl_complete", stats)

    def get_stats(self) -> dict:
        """Get crawl statistics from event log."""
        stats = {
            "total_pages": 0,
            "successful_pages": 0,
            "failed_pages": 0,
            "documents_found": 0,
            "extractions_successful": 0,
            "extractions_failed": 0,
            "quality_passed": 0,
            "quality_failed": 0,
            "errors": 0
        }

        if not self.event_log_file.exists():
            return stats

        with open(self.event_log_file, 'r') as f:
            for line in f:
                event = json.loads(line)
                event_type = event["event_type"]

                if event_type == "page_crawled":
                    stats["total_pages"] += 1
                    if event["data"]["success"]:
                        stats["successful_pages"] += 1
                    else:
                        stats["failed_pages"] += 1

                elif event_type == "document_found":
                    stats["documents_found"] += 1

                elif event_type == "extraction":
                    if event["data"]["success"]:
                        stats["extractions_successful"] += 1
                    else:
                        stats["extractions_failed"] += 1

                elif event_type == "quality_check":
                    if event["data"]["passed"]:
                        stats["quality_passed"] += 1
                    else:
                        stats["quality_failed"] += 1

                elif event_type == "error":
                    stats["errors"] += 1

        return stats
