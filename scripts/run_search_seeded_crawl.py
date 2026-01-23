#!/usr/bin/env python3
"""Run a crawl using web-search seeding and download documents locally."""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from typing import Any, Dict

import httpx

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "application/pdf,application/octet-stream;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
}


def download_with_retries(client: httpx.Client, url: str, max_retries: int = 3) -> httpx.Response | None:
    for attempt in range(max_retries):
        try:
            resp = client.get(url, follow_redirects=True)
        except Exception:
            time.sleep(1.5 * (2 ** attempt))
            continue
        if resp.headers.get("cf-mitigated"):
            return None
        if resp.status_code < 400:
            return resp
        if resp.status_code in {403, 429, 500, 502, 503, 504}:
            retry_after = resp.headers.get("retry-after")
            delay = None
            if retry_after:
                try:
                    delay = float(retry_after)
                except ValueError:
                    delay = None
            if delay is None:
                delay = 1.5 * (2 ** attempt)
            time.sleep(delay)
            continue
        return None
    return None

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
    with httpx.Client(timeout=60, headers=DEFAULT_HEADERS) as client:
        resp = client.post(f"{API_BASE}/crawl", json=payload)
        resp.raise_for_status()
        crawl_id = resp.json().get("crawl_id")

    print("crawl_id", crawl_id)
    status = wait_for_completion(crawl_id)
    print("status", status.get("current_state"), status.get("current_substate"))

    with httpx.Client(timeout=60, headers=DEFAULT_HEADERS) as client:
        docs = client.get(
            f"{API_BASE}/documents/{crawl_id}", params={"limit": args.max_docs}
        ).json().get("documents", [])

    out_dir = Path(args.out_root) / crawl_id / "raw"
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = []

    with httpx.Client(timeout=60, headers=DEFAULT_HEADERS) as client:
        for idx, doc in enumerate(docs, start=1):
            url = doc.get("url") or ""
            if not url:
                continue
            response = download_with_retries(client, url)
            if not response:
                continue
            name = url.split("?", 1)[0].split("/")[-1] or f"document_{idx}.pdf"
            out_path = out_dir / f"{idx:04d}_{name}"
            out_path.write_bytes(response.content)
            manifest.append({"url": url, "path": str(out_path)})

    manifest_path = Path(args.out_root) / crawl_id / "manifest.json"
    manifest_path.write_text(json.dumps({"crawl_id": crawl_id, "count": len(manifest), "documents": manifest}, indent=2))

    print("downloaded", len(manifest))
    print("manifest", manifest_path)


if __name__ == "__main__":
    main()
