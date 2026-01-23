#!/usr/bin/env python3
"""Run a crawl using web-search seeding and download documents locally."""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from typing import Any, Dict

import httpx

API_BASE = "http://localhost:8000/api/v1"


def wait_for_completion(crawl_id: str, timeout_s: int = 1800) -> Dict[str, Any]:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        with httpx.Client(timeout=30) as client:
            resp = client.get(f"{API_BASE}/crawl/{crawl_id}/status")
            if resp.status_code == 404:
                resp = client.get(f"{API_BASE}/crawls/{crawl_id}/status")
            resp.raise_for_status()
            data = resp.json()
        if data.get("is_terminal"):
            return data
        time.sleep(10)
    raise TimeoutError("Crawl did not finish within timeout")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", required=True)
    parser.add_argument("--max-docs", type=int, default=200)
    parser.add_argument("--out-root", default="data/crawl_runs")
    args = parser.parse_args()

    # Submit crawl (orchestrator will auto-seed targets via web search)
    payload = {"query": args.query}
    with httpx.Client(timeout=60) as client:
        resp = client.post(f"{API_BASE}/crawl", json=payload)
        resp.raise_for_status()
        crawl_id = resp.json().get("crawl_id")

    print("crawl_id", crawl_id)
    status = wait_for_completion(crawl_id)
    print("status", status.get("current_state"), status.get("current_substate"))

    with httpx.Client(timeout=60) as client:
        docs = client.get(f"{API_BASE}/documents/{crawl_id}", params={"limit": args.max_docs}).json().get("documents", [])

    out_dir = Path(args.out_root) / crawl_id / "raw"
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = []

    with httpx.Client(timeout=60) as client:
        for idx, doc in enumerate(docs, start=1):
            url = doc.get("url") or ""
            if not url:
                continue
            try:
                r = client.get(url)
            except Exception:
                continue
            if r.status_code != 200:
                continue
            name = url.split("?", 1)[0].split("/")[-1] or f"document_{idx}.pdf"
            out_path = out_dir / f"{idx:04d}_{name}"
            out_path.write_bytes(r.content)
            manifest.append({"url": url, "path": str(out_path)})

    manifest_path = Path(args.out_root) / crawl_id / "manifest.json"
    manifest_path.write_text(json.dumps({"crawl_id": crawl_id, "count": len(manifest), "documents": manifest}, indent=2))

    print("downloaded", len(manifest))
    print("manifest", manifest_path)


if __name__ == "__main__":
    main()
