"""Ingestion Router - normalize and store crawl results."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from pathlib import Path
import json

from utils.ingestion import ingest_crawl_from_logs, curate_ingestion_output
from utils.nv_ingest import run_nv_ingest_from_manifest
from utils.paths import get_repo_root

router = APIRouter()


class IngestRequest(BaseModel):
    crawl_id: str
    overwrite: bool = False
    limit: Optional[int] = None
    run_nemo_curator: Optional[bool] = None
    curate: Optional[bool] = None
    extract_text: Optional[bool] = None


class IngestResponse(BaseModel):
    crawl_id: str
    ingested_count: int
    duplicate_count: int
    output_dir: str
    manifest_path: str


class CurateResponse(BaseModel):
    crawl_id: str
    nemo_curated_jsonl: str
    counts: Dict[str, Any]


class NvIngestRequest(BaseModel):
    dry_run: bool = False


class NvIngestResponse(BaseModel):
    status: str
    file_count: int
    host: str
    port: int
    options: Dict[str, Any]
    started_at: float
    duration_seconds: Optional[float] = None
    results: Optional[int] = None
    failures: Optional[int] = None
    failures_sample: Optional[List[Any]] = None


class IngestDocument(BaseModel):
    id: Optional[str] = None
    title: str
    url: str
    file_type: str
    document_type: Optional[str] = None
    file_size: int = 0
    quality_score: float = 0.0
    tags: List[str] = []
    discovered_at: Optional[str] = None
    crawl_id: str
    source_domain: Optional[str] = None
    source_date: Optional[str] = None
    source_page: Optional[str] = None
    content_type: Optional[str] = None
    last_modified: Optional[str] = None
    taxonomy: Optional[Dict[str, Any]] = None
    structured_path: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class IngestDocumentsResponse(BaseModel):
    documents: List[IngestDocument]
    total: int


def _load_manifest(crawl_id: str) -> Optional[Dict[str, Any]]:
    manifest_path = get_repo_root() / "data" / "ingestion" / crawl_id / "manifest.json"
    if not manifest_path.exists():
        return None
    with open(manifest_path, "r") as handle:
        return json.load(handle)


@router.post("/ingest", response_model=IngestResponse)
async def ingest_crawl(request: IngestRequest):
    """Normalize crawl results into a structured JSONL output."""
    try:
        result = ingest_crawl_from_logs(
            crawl_id=request.crawl_id,
            overwrite=request.overwrite,
            limit=request.limit,
            run_nemo_curator=request.run_nemo_curator,
            curate=request.curate,
            extract_text=request.extract_text,
        )
        return IngestResponse(**result.to_dict())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/ingest/{crawl_id}/status")
async def get_ingest_status(crawl_id: str):
    """Get ingestion status from manifest."""
    manifest = _load_manifest(crawl_id)
    if not manifest:
        raise HTTPException(status_code=404, detail="Ingestion manifest not found")
    return manifest


@router.get("/ingest/{crawl_id}/documents", response_model=IngestDocumentsResponse)
async def list_ingested_documents(
    crawl_id: str,
    limit: int = Query(200, ge=1, le=1000),
):
    """List ingested documents for a crawl."""
    documents_path = get_repo_root() / "data" / "ingestion" / crawl_id / "documents.jsonl"
    if not documents_path.exists():
        raise HTTPException(status_code=404, detail="Ingested documents not found")

    documents: List[Dict[str, Any]] = []
    with open(documents_path, "r") as handle:
        for line in handle:
            try:
                documents.append(json.loads(line.strip()))
            except json.JSONDecodeError:
                continue
            if len(documents) >= limit:
                break

    return IngestDocumentsResponse(
        documents=[IngestDocument(**doc) for doc in documents],
        total=len(documents),
    )


@router.get("/ingest/{crawl_id}/download")
async def download_ingested_documents(
    crawl_id: str,
    format: str = Query("jsonl", description="Output format: jsonl, json, nemo_curator_jsonl, nemo_curated_jsonl"),
):
    """Download ingested documents in JSONL or JSON format."""
    documents_path = get_repo_root() / "data" / "ingestion" / crawl_id / "documents.jsonl"
    nemo_output_path = get_repo_root() / "data" / "ingestion" / crawl_id / "nemo_curator.jsonl"
    nemo_curated_path = get_repo_root() / "data" / "ingestion" / crawl_id / "nemo_curated.jsonl"

    if format in {"nemo_curator_jsonl", "nemo_curated_jsonl"}:
        selected_path = nemo_output_path if format == "nemo_curator_jsonl" else nemo_curated_path
        if not selected_path.exists():
            raise HTTPException(status_code=404, detail="Nemo export not found")
        with open(selected_path, "r") as handle:
            content = handle.read()
        return {"format": format, "content": content}

    if not documents_path.exists():
        raise HTTPException(status_code=404, detail="Ingested documents not found")

    if format == "json":
        documents = []
        with open(documents_path, "r") as handle:
            for line in handle:
                try:
                    documents.append(json.loads(line.strip()))
                except json.JSONDecodeError:
                    continue
        return {"format": "json", "documents": documents}

    with open(documents_path, "r") as handle:
        content = handle.read()
    return {"format": "jsonl", "content": content}


@router.post("/ingest/{crawl_id}/curate", response_model=CurateResponse)
async def curate_ingested_documents(crawl_id: str):
    """Create a curated Nemo JSONL export from existing ingestion output."""
    try:
        result = curate_ingestion_output(crawl_id)
        return CurateResponse(**result)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/ingest/{crawl_id}/nv-ingest", response_model=NvIngestResponse)
async def run_nv_ingest(crawl_id: str, request: NvIngestRequest):
    """Run NV Ingest using the stored manifest."""
    try:
        result = run_nv_ingest_from_manifest(crawl_id, dry_run=request.dry_run)
        return NvIngestResponse(**result)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=501, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
