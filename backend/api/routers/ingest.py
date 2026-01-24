"""Ingestion Router - normalize and store crawl results."""

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import time
from pathlib import Path
from datetime import datetime
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


class IngestRunSummary(BaseModel):
    crawl_id: str
    status: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    counts: Optional[Dict[str, Any]] = None
    output: Optional[Dict[str, Any]] = None


class IngestRunsResponse(BaseModel):
    runs: List[IngestRunSummary]
    total: int


def _load_manifest(crawl_id: str) -> Optional[Dict[str, Any]]:
    manifest_path = get_repo_root() / "data" / "ingestion" / crawl_id / "manifest.json"
    if not manifest_path.exists():
        return None
    with open(manifest_path, "r") as handle:
        return json.load(handle)


def _load_async_status(crawl_id: str) -> Optional[Dict[str, Any]]:
    status_path = _ingest_status_path(crawl_id)
    if not status_path.exists():
        return None
    try:
        return json.loads(status_path.read_text())
    except json.JSONDecodeError:
        return None


def _normalize_timestamp(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return datetime.utcfromtimestamp(value).isoformat() + "Z"
    if isinstance(value, str):
        return value
    return None


def _ingest_status_path(crawl_id: str) -> Path:
    return get_repo_root() / "data" / "ingestion" / crawl_id / "ingest_status.json"


def _write_ingest_status(crawl_id: str, payload: Dict[str, Any]) -> None:
    status_path = _ingest_status_path(crawl_id)
    status_path.parent.mkdir(parents=True, exist_ok=True)
    status_path.write_text(json.dumps(payload, indent=2))


def _run_ingest_job(request: IngestRequest) -> None:
    started = time.time()
    _write_ingest_status(
        request.crawl_id,
        {"status": "running", "started_at": started, "request": request.dict()},
    )
    try:
        result = ingest_crawl_from_logs(
            crawl_id=request.crawl_id,
            overwrite=request.overwrite,
            limit=request.limit,
            run_nemo_curator=request.run_nemo_curator,
            curate=request.curate,
            extract_text=request.extract_text,
        )
        _write_ingest_status(
            request.crawl_id,
            {
                "status": "completed",
                "started_at": started,
                "completed_at": time.time(),
                "result": result.to_dict(),
            },
        )
    except Exception as exc:
        _write_ingest_status(
            request.crawl_id,
            {
                "status": "failed",
                "started_at": started,
                "completed_at": time.time(),
                "error": str(exc),
            },
        )


def _resolve_ingestion_path(crawl_id: str, requested_path: str) -> Path:
    if not requested_path:
        raise HTTPException(status_code=400, detail="Missing structured file path")
    output_root = (get_repo_root() / "data" / "ingestion" / crawl_id).resolve()
    target = (output_root / requested_path).resolve()
    if target == output_root or output_root not in target.parents:
        raise HTTPException(status_code=400, detail="Invalid structured file path")
    if not target.exists():
        raise HTTPException(status_code=404, detail="Structured file not found")
    if not target.is_file():
        raise HTTPException(status_code=400, detail="Structured path is not a file")
    return target


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


@router.post("/ingest/async")
async def ingest_crawl_async(request: IngestRequest, background_tasks: BackgroundTasks):
    """Run ingestion in the background and return immediately with status path."""
    background_tasks.add_task(_run_ingest_job, request)
    status_path = _ingest_status_path(request.crawl_id)
    return {
        "crawl_id": request.crawl_id,
        "status": "queued",
        "status_path": str(status_path),
    }


@router.get("/ingest/{crawl_id}/status-async")
async def get_async_ingest_status(crawl_id: str):
    """Get async ingestion status if available."""
    status_path = _ingest_status_path(crawl_id)
    if not status_path.exists():
        raise HTTPException(status_code=404, detail="Async ingest status not found")
    return json.loads(status_path.read_text())


@router.get("/ingest/{crawl_id}/status")
async def get_ingest_status(crawl_id: str):
    """Get ingestion status from manifest."""
    manifest = _load_manifest(crawl_id)
    if not manifest:
        raise HTTPException(status_code=404, detail="Ingestion manifest not found")
    return manifest


@router.get("/ingest/runs", response_model=IngestRunsResponse)
async def list_ingest_runs(limit: int = Query(20, ge=1, le=200)):
    """List recent ingestion runs."""
    ingest_root = get_repo_root() / "data" / "ingestion"
    if not ingest_root.exists():
        return IngestRunsResponse(runs=[], total=0)

    runs: List[IngestRunSummary] = []
    for entry in ingest_root.iterdir():
        if not entry.is_dir():
            continue
        crawl_id = entry.name
        manifest = _load_manifest(crawl_id)
        status = _load_async_status(crawl_id)
        if not manifest and not status:
            continue
        created_at = None
        updated_at = None
        counts = None
        output = None
        status_value = "unknown"
        if status:
            status_value = status.get("status") or status_value
            updated_at = _normalize_timestamp(status.get("completed_at") or status.get("started_at"))
        if manifest:
            created_at = _normalize_timestamp(manifest.get("created_at") or created_at)
            counts = manifest.get("counts")
            output = manifest.get("output")
        runs.append(
            IngestRunSummary(
                crawl_id=crawl_id,
                status=status_value,
                created_at=created_at,
                updated_at=updated_at,
                counts=counts,
                output=output,
            )
        )

    runs.sort(key=lambda run: run.updated_at or run.created_at or "", reverse=True)
    return IngestRunsResponse(runs=runs[:limit], total=len(runs))


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


@router.get("/ingest/{crawl_id}/structured")
async def get_structured_document(
    crawl_id: str,
    path: str = Query(..., description="Relative path to structured JSON output"),
):
    """Return a structured document JSON blob from ingestion output."""
    target = _resolve_ingestion_path(crawl_id, path)
    with open(target, "r") as handle:
        try:
            data = json.load(handle)
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="Structured file contains invalid JSON")
    return {"path": str(target.relative_to(get_repo_root() / "data" / "ingestion" / crawl_id)), "data": data}


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
