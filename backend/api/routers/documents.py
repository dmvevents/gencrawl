"""Documents Router - Document discovery and management endpoints."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from pathlib import Path
import json
import os
import sys

from utils.paths import get_log_dir

# Add parent directory to path for imports
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, backend_dir)

router = APIRouter()

# Data directory for document storage
DATA_DIR = Path(__file__).parent.parent.parent.parent / "data" / "documents"
DATA_DIR.mkdir(parents=True, exist_ok=True)


class Document(BaseModel):
    """Document model."""
    id: str
    title: str
    url: str
    file_type: str
    document_type: Optional[str] = None
    file_size: int = 0
    quality_score: float = 0.0
    tags: List[str] = []
    discovered_at: str
    crawl_id: str
    source_date: Optional[str] = None
    source_page: Optional[str] = None
    content_type: Optional[str] = None
    last_modified: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class DocumentsResponse(BaseModel):
    """Response for document listing."""
    documents: List[Document]
    total: int


def _get_documents_from_logs(crawl_id: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    """Extract documents from crawl event logs."""
    log_dir = get_log_dir()
    documents = []

    if not log_dir.exists():
        return documents

    # Determine which log files to read
    if crawl_id:
        log_files = [log_dir / f"crawl_{crawl_id}_events.jsonl"]
    else:
        log_files = list(log_dir.glob("crawl_*_events.jsonl"))

    doc_id_counter = 0
    for log_file in log_files:
        if not log_file.exists():
            continue

        try:
            with open(log_file, 'r') as f:
                for line in f:
                    try:
                        event = json.loads(line.strip())

                        # Look for document_found events
                        if event.get("event_type") == "document_found":
                            data = event.get("data", {})
                            doc_id_counter += 1

                            doc = {
                                "id": f"doc_{doc_id_counter}",
                                "title": data.get("title", "Untitled Document"),
                                "url": data.get("url", ""),
                                "file_type": data.get("file_type", "unknown"),
                                "document_type": data.get("document_type"),
                                "file_size": data.get("file_size", 0),
                                "quality_score": data.get("quality_score", 0.0),
                                "tags": data.get("tags", []),
                                "discovered_at": event.get("timestamp", datetime.now().isoformat()),
                                "crawl_id": event.get("crawl_id", ""),
                                "source_date": data.get("source_date"),
                                "source_page": data.get("source_page"),
                                "content_type": (data.get("metadata", {}) or {}).get("content_type"),
                                "last_modified": (data.get("metadata", {}) or {}).get("last_modified"),
                                "metadata": data.get("metadata", {})
                            }
                            documents.append(doc)

                        # Also check page_crawled events for documents
                        elif event.get("event_type") == "page_crawled":
                            data = event.get("data", {})
                            if data.get("documents"):
                                for doc_data in data.get("documents", []):
                                    doc_id_counter += 1
                                    doc = {
                                        "id": f"doc_{doc_id_counter}",
                                        "title": doc_data.get("title", "Untitled Document"),
                                        "url": doc_data.get("url", data.get("url", "")),
                                        "file_type": doc_data.get("file_type", "html"),
                                        "document_type": doc_data.get("document_type"),
                                        "file_size": doc_data.get("file_size", 0),
                                        "quality_score": doc_data.get("quality_score", 0.0),
                                        "tags": doc_data.get("tags", []),
                                        "discovered_at": event.get("timestamp", datetime.now().isoformat()),
                                        "crawl_id": event.get("crawl_id", ""),
                                        "source_date": doc_data.get("source_date"),
                                        "source_page": doc_data.get("source_page"),
                                        "content_type": (doc_data.get("metadata", {}) or {}).get("content_type"),
                                        "last_modified": (doc_data.get("metadata", {}) or {}).get("last_modified"),
                                        "metadata": doc_data.get("metadata", {})
                                    }
                                    documents.append(doc)

                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            print(f"Error reading log file {log_file}: {e}")
            continue

    # Sort by discovered_at descending (most recent first)
    documents.sort(key=lambda x: x.get("discovered_at", ""), reverse=True)

    return documents[:limit]


@router.get("/documents/recent", response_model=DocumentsResponse)
async def get_recent_documents(
    limit: int = Query(10, ge=1, le=100, description="Maximum number of documents to return")
):
    """Get recently discovered documents across all crawls."""
    documents = _get_documents_from_logs(crawl_id=None, limit=limit)

    return DocumentsResponse(
        documents=[Document(**doc) for doc in documents],
        total=len(documents)
    )


@router.get("/documents/{crawl_id}", response_model=DocumentsResponse)
async def get_crawl_documents(
    crawl_id: str,
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of documents to return")
):
    """Get all documents for a specific crawl."""
    documents = _get_documents_from_logs(crawl_id=crawl_id, limit=limit)

    return DocumentsResponse(
        documents=[Document(**doc) for doc in documents],
        total=len(documents)
    )


@router.get("/crawl/{crawl_id}/documents", response_model=DocumentsResponse)
async def get_documents_by_crawl(
    crawl_id: str,
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of documents to return")
):
    """Get all documents for a specific crawl (alternative endpoint)."""
    return await get_crawl_documents(crawl_id, limit)
