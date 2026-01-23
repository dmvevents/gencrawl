#!/usr/bin/env python3
"""Shallow link crawler for a domain that downloads document files."""
from __future__ import annotations

import argparse
import json
from collections import deque
from pathlib import Path
from typing import Set
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

EXTS = (".pdf", ".doc", ".docx")


def same_domain(url: str, domain: str) -> bool:
    return urlparse(url).netloc.endswith(domain)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", nargs="+", required=True)
    parser.add_argument("--domain", required=True)
    parser.add_argument("--max-pages", type=int, default=300)
    parser.add_argument("--out-dir", default="data/crawl_runs/link_harvest")
    args = parser.parse_args()

    out_root = Path(args.out_dir)
    out_root.mkdir(parents=True, exist_ok=True)
    raw_dir = out_root / args.domain
    raw_dir.mkdir(parents=True, exist_ok=True)

    queue = deque(args.start)
    seen: Set[str] = set()
    docs = []

    with httpx.Client(timeout=30) as client:
        while queue and len(seen) < args.max_pages:
            url = queue.popleft()
            if url in seen:
                continue
            seen.add(url)
            try:
                resp = client.get(url)
            except Exception:
                continue
            if resp.status_code != 200:
                continue
            content_type = resp.headers.get("content-type", "")
            if any(url.lower().endswith(ext) for ext in EXTS):
                name = url.split("?", 1)[0].split("/")[-1]
                out_path = raw_dir / name
                out_path.write_bytes(resp.content)
                docs.append({"url": url, "path": str(out_path)})
                continue
            if "text/html" not in content_type:
                continue
            soup = BeautifulSoup(resp.text, "html.parser")
            for a in soup.find_all("a", href=True):
                href = a["href"].strip()
                if href.startswith("mailto:") or href.startswith("tel:"):
                    continue
                full = urljoin(url, href)
                if any(full.lower().endswith(ext) for ext in EXTS):
                    if full not in seen:
                        queue.append(full)
                elif same_domain(full, args.domain):
                    if full not in seen:
                        queue.append(full)

    manifest_path = out_root / f"{args.domain}_manifest.json"
    manifest_path.write_text(json.dumps({"count": len(docs), "documents": docs}, indent=2))
    print("downloaded", len(docs))
    print("manifest", manifest_path)


if __name__ == "__main__":
    main()
