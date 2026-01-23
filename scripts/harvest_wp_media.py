#!/usr/bin/env python3
"""Harvest PDF/DOC attachments from WordPress media API."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import List

import httpx

EXTS = (".pdf", ".doc", ".docx")


def fetch_media(domain: str, client: httpx.Client, max_pages: int = 0) -> List[dict]:
    base = domain.rstrip("/") + "/wp-json/wp/v2/media"
    page = 1
    items: List[dict] = []
    while True:
        resp = client.get(base, params={"per_page": 100, "page": page})
        if resp.status_code == 400:
            break
        resp.raise_for_status()
        items.extend(resp.json())
        total_pages = int(resp.headers.get("X-WP-TotalPages", "1"))
        if page >= total_pages:
            break
        if max_pages and page >= max_pages:
            break
        page += 1
    return items


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--domains", nargs="+", required=True)
    parser.add_argument("--out-dir", default="data/crawl_runs/wp_media")
    parser.add_argument("--max-pages", type=int, default=0, help="Limit WP media pages per domain (0 = no limit)")
    args = parser.parse_args()

    out_root = Path(args.out_dir)
    out_root.mkdir(parents=True, exist_ok=True)

    manifest = []
    with httpx.Client(timeout=60) as client:
        for domain in args.domains:
            try:
                items = fetch_media(domain, client, args.max_pages)
            except Exception:
                continue
            for item in items:
                url = item.get("source_url") or ""
                if not url.lower().endswith(EXTS):
                    continue
                try:
                    r = client.get(url)
                except Exception:
                    continue
                if r.status_code != 200:
                    continue
                name = url.split("?", 1)[0].split("/")[-1]
                out_dir = out_root / domain.replace("https://", "").replace("http://", "")
                out_dir.mkdir(parents=True, exist_ok=True)
                out_path = out_dir / name
                out_path.write_bytes(r.content)
                manifest.append({"domain": domain, "url": url, "path": str(out_path)})

    manifest_path = out_root / "manifest.json"
    manifest_path.write_text(json.dumps({"count": len(manifest), "documents": manifest}, indent=2))
    print("downloaded", len(manifest))
    print("manifest", manifest_path)


if __name__ == "__main__":
    main()
