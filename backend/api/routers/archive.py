"""Archive Router - canonical document archive and duplicates."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from pathlib import Path
import json

from utils.paths import get_repo_root

router = APIRouter()


class ArchiveEntry(BaseModel):
    hash: str
    hash_basis: Optional[str] = None
    canonical_url: Optional[str] = None
    urls: List[str] = []
    url_count: int = 0
    title: Optional[str] = None
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    source_date: Optional[str] = None
    taxonomy: Optional[Dict[str, Any]] = None
    structured_path: Optional[str] = None
    source_domains: List[str] = []
    first_seen_at: Optional[str] = None
    last_seen_at: Optional[str] = None
    crawl_ids: List[str] = []
    quality_score: Optional[float] = None


class ArchiveResponse(BaseModel):
    entries: List[ArchiveEntry]
    total: int


def _archive_index_path() -> Path:
    return get_repo_root() / "data" / "archive" / "index.jsonl"


def _load_entries() -> List[Dict[str, Any]]:
    path = _archive_index_path()
    if not path.exists():
        return []
    entries: List[Dict[str, Any]] = []
    with open(path, "r") as handle:
        for line in handle:
            if not line.strip():
                continue
            try:
                entries.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return entries


@router.get("/archive", response_model=ArchiveResponse)
async def list_archive(
    limit: int = Query(200, ge=1, le=2000),
    search: Optional[str] = Query(None),
    program: Optional[str] = Query(None),
    subject: Optional[str] = Query(None),
    doc_type: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    domain: Optional[str] = Query(None),
):
    entries = _load_entries()
    query = (search or "").strip().lower()

    def matches(entry: Dict[str, Any]) -> bool:
        if program and (entry.get("taxonomy", {}) or {}).get("program") != program:
            return False
        if subject and (entry.get("taxonomy", {}) or {}).get("subject") != subject:
            return False
        if doc_type and (entry.get("taxonomy", {}) or {}).get("document_type") != doc_type:
            return False
        if year and (entry.get("taxonomy", {}) or {}).get("year") != year:
            return False
        if domain and domain not in (entry.get("source_domains") or []):
            return False
        if not query:
            return True
        haystack = " ".join(
            [
                entry.get("title") or "",
                entry.get("canonical_url") or "",
                " ".join(entry.get("urls") or []),
                " ".join(entry.get("source_domains") or []),
                (entry.get("taxonomy", {}) or {}).get("program") or "",
                (entry.get("taxonomy", {}) or {}).get("subject") or "",
                (entry.get("taxonomy", {}) or {}).get("document_type") or "",
                str((entry.get("taxonomy", {}) or {}).get("year") or ""),
            ]
        ).lower()
        return query in haystack

    filtered = [entry for entry in entries if matches(entry)]
    filtered.sort(key=lambda e: e.get("last_seen_at") or "", reverse=True)
    return ArchiveResponse(
        entries=[ArchiveEntry(**entry) for entry in filtered[:limit]],
        total=len(filtered),
    )


@router.get("/archive/{entry_hash}", response_model=ArchiveEntry)
async def get_archive_entry(entry_hash: str):
    entries = _load_entries()
    for entry in entries:
        if entry.get("hash") == entry_hash:
            return ArchiveEntry(**entry)
    raise HTTPException(status_code=404, detail="Archive entry not found")
