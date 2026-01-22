from __future__ import annotations

import json
import os
import socket
import time
from pathlib import Path
from typing import Any, Dict, Optional

from utils.paths import get_repo_root


def _load_manifest(crawl_id: str) -> Dict[str, Any]:
    manifest_path = (
        get_repo_root() / "data" / "ingestion" / crawl_id / "nv_ingest_manifest.json"
    )
    if not manifest_path.exists():
        raise FileNotFoundError("NV Ingest manifest not found. Run ingestion first.")
    with open(manifest_path, "r") as handle:
        return json.load(handle)


def _update_run_summary(crawl_id: str, summary: Dict[str, Any]) -> None:
    manifest_path = get_repo_root() / "data" / "ingestion" / crawl_id / "manifest.json"
    if not manifest_path.exists():
        return
    with open(manifest_path, "r") as handle:
        manifest = json.load(handle)
    manifest.setdefault("nemo", {})
    manifest["nemo"]["nv_ingest_run"] = summary
    with open(manifest_path, "w") as handle:
        json.dump(manifest, handle, indent=2)


def run_nv_ingest_from_manifest(
    crawl_id: str,
    dry_run: bool = False,
) -> Dict[str, Any]:
    manifest = _load_manifest(crawl_id)
    files = manifest.get("files") or []
    options = manifest.get("options") or {}
    env = manifest.get("env") or {}

    host = os.getenv("NV_INGEST_HOST") or env.get("NV_INGEST_HOST") or "localhost"
    port_value = os.getenv("NV_INGEST_PORT") or env.get("NV_INGEST_PORT") or "7670"
    try:
        port = int(port_value)
    except ValueError:
        port = 7670

    summary: Dict[str, Any] = {
        "status": "dry_run" if dry_run else "pending",
        "file_count": len(files),
        "host": host,
        "port": port,
        "options": options,
        "started_at": time.time(),
    }

    if dry_run:
        _update_run_summary(crawl_id, summary)
        return summary

    connect_timeout = float(os.getenv("NV_INGEST_CONNECT_TIMEOUT", "3"))
    try:
        with socket.create_connection((host, port), timeout=connect_timeout):
            pass
    except OSError as exc:
        summary["status"] = "unreachable"
        summary["error"] = f"unable_to_connect:{exc}"
        _update_run_summary(crawl_id, summary)
        raise RuntimeError(
            f"NV Ingest runtime unreachable at {host}:{port}. Set NV_INGEST_HOST/NV_INGEST_PORT."
        ) from exc

    try:
        from nv_ingest_client.client import Ingestor, NvIngestClient
    except ImportError as exc:
        raise RuntimeError(
            "nv-ingest-client not installed. Install nv-ingest-client or run with dry_run=true."
        ) from exc

    client = NvIngestClient(
        message_client_hostname=host,
        message_client_port=port,
    )

    ingestor = Ingestor(client=client)
    ingestor = ingestor.files(files)

    table_output_format = "markdown" if options.get("extract_tables", True) else "pseudo_markdown"
    extract_kwargs = {
        "extract_text": options.get("extract_text", True),
        "extract_infographics": False,
        "extract_tables": options.get("extract_tables", True),
        "extract_charts": False,
        "extract_images": options.get("extract_images", False),
        "extract_method": options.get("pdf_extract_method", "None"),
        "text_depth": options.get("text_depth", "page"),
        "table_output_format": table_output_format,
        "extract_page_as_image": False,
    }
    if extract_kwargs.get("extract_method") in {"None", "none", None}:
        extract_kwargs.pop("extract_method", None)

    ingestor = ingestor.extract(**extract_kwargs)

    split_source_types = ["text", "html", "mp3", "docx"]
    if os.getenv("NV_INGEST_ENABLE_PDF_SPLITTER", "true").lower() == "true":
        split_source_types = ["PDF"] + split_source_types

    ingestor = ingestor.split(
        tokenizer=os.getenv("NV_INGEST_TOKENIZER", "intfloat/e5-large-unsupervised"),
        chunk_size=int(options.get("chunk_size", 1024)),
        chunk_overlap=int(options.get("chunk_overlap", 150)),
        params={"split_source_types": split_source_types},
    )

    results, failures = ingestor.ingest(return_failures=True, show_progress=False)
    duration = time.time() - summary["started_at"]
    summary.update(
        {
            "status": "completed" if not failures else "completed_with_failures",
            "duration_seconds": round(duration, 2),
            "results": len(results) if results else 0,
            "failures": len(failures) if failures else 0,
            "failures_sample": failures[:5] if failures else [],
        }
    )
    _update_run_summary(crawl_id, summary)
    return summary
