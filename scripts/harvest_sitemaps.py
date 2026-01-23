#!/usr/bin/env python3
"""Harvest document URLs from sitemap(s) and download them locally."""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from typing import Iterable, List, Set, Tuple
import xml.etree.ElementTree as ET

import httpx

EXTS = {".pdf", ".doc", ".docx"}


def fetch_text(url: str, client: httpx.Client) -> str:
    resp = client.get(url, timeout=30)
    resp.raise_for_status()
    return resp.text


def parse_sitemap(xml_text: str) -> Tuple[List[str], List[str]]:
    urls: List[str] = []
    sitemaps: List[str] = []
    root = ET.fromstring(xml_text)
    ns = ""
    if root.tag.startswith("{"):
        ns = root.tag.split("}")[0] + "}"
    if root.tag.endswith("sitemapindex"):
        for sm in root.findall(f"{ns}sitemap/{ns}loc"):
            if sm.text:
                sitemaps.append(sm.text.strip())
    elif root.tag.endswith("urlset"):
        for loc in root.findall(f"{ns}url/{ns}loc"):
            if loc.text:
                urls.append(loc.text.strip())
    return urls, sitemaps


def walk_sitemaps(sitemap_urls: Iterable[str]) -> List[str]:
    seen: Set[str] = set()
    doc_urls: Set[str] = set()
    queue = list(sitemap_urls)
    with httpx.Client() as client:
        while queue:
            url = queue.pop(0)
            if url in seen:
                continue
            seen.add(url)
            try:
                xml_text = fetch_text(url, client)
            except Exception:
                continue
            urls, sitemaps = parse_sitemap(xml_text)
            for u in urls:
                if any(u.lower().endswith(ext) for ext in EXTS):
                    doc_urls.add(u)
            for sm in sitemaps:
                if sm not in seen:
                    queue.append(sm)
    return sorted(doc_urls)


def download_docs(urls: List[str], out_dir: Path) -> List[dict]:
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest = []
    with httpx.Client() as client:
        for idx, url in enumerate(urls, start=1):
            try:
                resp = client.get(url, timeout=60)
            except Exception:
                continue
            if resp.status_code != 200:
                continue
            name = url.split("?", 1)[0].split("/")[-1]
            out_path = out_dir / f"{idx:04d}_{name}"
            out_path.write_bytes(resp.content)
            manifest.append({"url": url, "path": str(out_path)})
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sitemaps", nargs="+", required=True)
    parser.add_argument("--out-dir", default=None)
    args = parser.parse_args()

    run_id = time.strftime("%Y%m%d_%H%M%S")
    out_root = Path(args.out_dir) if args.out_dir else Path("data") / "crawl_runs" / f"sitemap_{run_id}"
    out_root.mkdir(parents=True, exist_ok=True)

    urls = walk_sitemaps(args.sitemaps)
    manifest = download_docs(urls, out_root / "raw")

    manifest_path = out_root / "manifest.json"
    manifest_path.write_text(json.dumps({"count": len(manifest), "documents": manifest}, indent=2))

    print("found", len(urls), "downloaded", len(manifest))
    print("manifest", manifest_path)


if __name__ == "__main__":
    main()
