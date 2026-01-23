#!/usr/bin/env python3
"""
Run a crawl, download discovered documents, and OCR scanned pages via VLMs.

Defaults:
- Crawl via API on localhost:8000
- Download PDFs only
- OCR with OpenAI (primary) and Gemini (fallback)

Examples:
  .venv/bin/python scripts/run_crawl_and_vlm_ocr.py \\
    --query "SEA CSEC CXC past papers and official PDFs" \\
    --targets https://www.cxc.org/examinations/ https://storage.moe.gov.tt/ https://moe.gov.tt/sea-2026-registration-for-private-candidates/ \\
    --file-types pdf doc docx \\
    --max-docs 1000 \\
    --max-ocr-pages 150 \\
    --ocr-provider hybrid
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import fitz
import httpx
from PIL import Image, ImageFilter, ImageOps

API_BASE = os.getenv("GENCRAWL_API", "http://localhost:8000/api/v1")


def slugify(text: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9._-]+", "_", text)
    return text.strip("_") or "document"


def submit_crawl(query: str, targets: List[str], file_types: List[str], max_docs: int) -> Dict[str, str]:
    payload = {
        "query": query,
        "output_format": "pretraining",
        "strategy": "sitemap",
        "crawler": "scrapy",
        "file_types": file_types or None,
        "targets": targets or None,
        "limits": {
            "max_documents": max_docs,
            "max_sitemaps": 200,
            "max_sitemap_urls": 3000,
            "max_page_scans": 400,
            "max_wp_media_pages": 15,
            "max_wp_media_items": 2000,
        },
        "respect_robots_txt": True,
    }
    with httpx.Client(timeout=60) as client:
        resp = client.post(f"{API_BASE}/crawl", json=payload)
        resp.raise_for_status()
        return resp.json()


def wait_for_completion(crawl_id: str, timeout_s: int = 900) -> Dict[str, str]:
    deadline = time.time() + timeout_s
    last_status = None
    while time.time() < deadline:
        with httpx.Client(timeout=30) as client:
            resp = client.get(f"{API_BASE}/crawls/{crawl_id}/status")
            if resp.status_code == 404:
                # Fallback endpoint if needed
                resp = client.get(f"{API_BASE}/crawl/{crawl_id}/status")
            resp.raise_for_status()
            status = resp.json().get("status")
        if status != last_status:
            print(f"[crawl] status={status}")
            last_status = status
        if status in ("completed", "failed", "cancelled"):
            return resp.json()
        time.sleep(5)
    raise TimeoutError(f"Crawl {crawl_id} did not finish within {timeout_s}s")


def fetch_documents(crawl_id: str, limit: int) -> List[Dict[str, str]]:
    with httpx.Client(timeout=30) as client:
        resp = client.get(f"{API_BASE}/documents/{crawl_id}", params={"limit": limit})
        resp.raise_for_status()
        return resp.json().get("documents", [])


def download_document(url: str, out_dir: Path, index: int) -> Optional[Path]:
    try:
        with httpx.Client(timeout=60) as client:
            resp = client.get(url)
            if resp.status_code != 200:
                return None
            filename = slugify(Path(url.split("?", 1)[0]).name)
            if not filename:
                filename = f"document_{index}.pdf"
            if not Path(filename).suffix:
                # Guess pdf if content-type suggests
                content_type = resp.headers.get("content-type", "")
                ext = ".pdf" if "pdf" in content_type else ""
                filename += ext
            out_path = out_dir / f"{index:04d}_{filename}"
            out_path.write_bytes(resp.content)
            return out_path
    except httpx.RequestError:
        return None


def extract_text_layer(page: fitz.Page, min_chars: int) -> Optional[str]:
    text = page.get_text("text").strip()
    if len(text) >= min_chars:
        return text
    return None


def ocr_openai(
    image_path: Path,
    model: str,
    api_key: str,
    max_output_tokens: int,
    use_base64: bool,
) -> Dict[str, object]:
    with image_path.open("rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a document OCR engine. Return only JSON."},
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Extract OCR text and structure. Return JSON only. "
                            + (
                                "Use base64 for long fields. Return keys: text_b64, markdown_b64, "
                                if use_base64
                                else "Return keys: text, markdown, "
                            )
                            + "equations (array of {latex,bbox,confidence}), "
                            + "tables (array of {markdown,bbox,confidence}), fields (array of {label,value}), "
                            + "headings (array). Use bbox as normalized [x1,y1,x2,y2] values from 0-1."
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{b64}", "detail": "high"},
                    },
                ],
            },
        ],
        "temperature": 0,
        "max_tokens": max_output_tokens,
    }
    with httpx.Client(timeout=60) as client:
        resp = client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            content=json.dumps(payload),
        )
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"].strip()
    return {"provider": "openai", "raw": content, "raw_response": data}


def ocr_gemini(
    image_path: Path,
    model: str,
    api_key: str,
    max_output_tokens: int,
    use_base64: bool,
) -> Dict[str, object]:
    with image_path.open("rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "text": (
                            "Extract OCR text and structure. Return JSON only. "
                            + (
                                "Use base64 for long fields. Return keys: text_b64, markdown_b64, "
                                if use_base64
                                else "Return keys: text, markdown, "
                            )
                            + "equations (array of {latex,bbox,confidence}), "
                            + "tables (array of {markdown,bbox,confidence}), fields (array of {label,value}), "
                            + "headings (array). Use bbox as normalized [x1,y1,x2,y2] values from 0-1."
                        )
                    },
                    {"inline_data": {"mime_type": "image/png", "data": b64}},
                ],
            }
        ],
        "generationConfig": {"temperature": 0, "maxOutputTokens": max_output_tokens},
    }
    def _extract_text(response: Dict[str, object]) -> str:
        candidates = response.get("candidates") or []
        for candidate in candidates:
            content = candidate.get("content") or {}
            parts = content.get("parts") or []
            texts = []
            for part in parts:
                if isinstance(part, dict) and part.get("text"):
                    texts.append(str(part["text"]))
            if texts:
                return "\n".join(texts).strip()
        return ""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    with httpx.Client(timeout=60) as client:
        resp = client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        content = _extract_text(data)
    usage = data.get("usageMetadata", {})
    result: Dict[str, object] = {"provider": "gemini", "raw": content, "usage": usage}
    if not content:
        result["error"] = "No text returned in Gemini response parts"
        result["raw_response"] = data
    return result


def parse_json_maybe(raw: str) -> object:
    if "```json" in raw:
        raw = raw.split("```json", 1)[1].split("```", 1)[0].strip()
    elif "```" in raw:
        raw = raw.split("```", 1)[1].split("```", 1)[0].strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Best-effort: try extracting the largest JSON-like blob
        start = raw.find("{")
        end = raw.rfind("}")
        if start != -1 and end != -1 and end > start:
            candidate = raw[start : end + 1]
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                pass
        # Fallback: regex extract key fields from malformed JSON
        extracted: Dict[str, str] = {}
        text_b64 = re.search(r'"text_b64"\s*:\s*"([^"]+)"', raw, re.DOTALL)
        if text_b64:
            extracted["text_b64"] = text_b64.group(1).replace("\n", "").replace("\r", "")
        markdown_b64 = re.search(r'"markdown_b64"\s*:\s*"([^"]+)"', raw, re.DOTALL)
        if markdown_b64:
            extracted["markdown_b64"] = markdown_b64.group(1).replace("\n", "").replace("\r", "")
        text_plain = re.search(r'"text"\s*:\s*"([^"]+)"', raw, re.DOTALL)
        if text_plain and "text_b64" not in extracted:
            extracted["text"] = text_plain.group(1)
        if extracted:
            return extracted
        return {"text": raw}


def normalize_ocr_payload(parsed: object) -> Dict[str, object]:
    if not isinstance(parsed, dict):
        return {"text": str(parsed), "markdown": str(parsed), "equations": [], "tables": []}
    text = parsed.get("text") or ""
    markdown = parsed.get("markdown") or ""
    def _clean_b64(value: str) -> str:
        cleaned = re.sub(r"[^A-Za-z0-9+/=]", "", value)
        padding = (-len(cleaned)) % 4
        if padding:
            cleaned += "=" * padding
        return cleaned
    if parsed.get("text_b64"):
        try:
            cleaned = _clean_b64(str(parsed["text_b64"]))
            text = base64.b64decode(cleaned).decode("utf-8", errors="ignore")
        except Exception:
            text = parsed.get("text_b64") or text
    if parsed.get("markdown_b64"):
        try:
            cleaned = _clean_b64(str(parsed["markdown_b64"]))
            markdown = base64.b64decode(cleaned).decode("utf-8", errors="ignore")
        except Exception:
            markdown = parsed.get("markdown_b64") or markdown
    if not markdown:
        markdown = parsed.get("markdown") or text
    equations = parsed.get("equations") or []
    tables = parsed.get("tables") or []
    parsed["text"] = text
    parsed["markdown"] = markdown
    parsed["equations"] = equations if isinstance(equations, list) else []
    parsed["tables"] = tables if isinstance(tables, list) else []
    return parsed


def ocr_page(
    image_path: Path,
    provider: str,
    openai_key: Optional[str],
    gemini_key: Optional[str],
    openai_model: str,
    gemini_model: str,
    max_output_tokens: int,
    use_base64: bool,
) -> Dict[str, object]:
    if provider == "all":
        results: List[Dict[str, object]] = []
        if openai_key:
            try:
                result = ocr_openai(image_path, openai_model, openai_key, max_output_tokens, use_base64)
                result["parsed"] = normalize_ocr_payload(parse_json_maybe(result["raw"]))
                results.append(result)
            except Exception as exc:
                results.append({"provider": "openai", "error": str(exc)})
        if gemini_key:
            try:
                result = ocr_gemini(image_path, gemini_model, gemini_key, max_output_tokens, use_base64)
                result["parsed"] = normalize_ocr_payload(parse_json_maybe(result["raw"]))
                results.append(result)
            except Exception as exc:
                results.append({"provider": "gemini", "error": str(exc)})
        return {"provider": "all", "results": results}
    if provider in ("openai", "hybrid") and openai_key:
        try:
            result = ocr_openai(image_path, openai_model, openai_key, max_output_tokens, use_base64)
            result["parsed"] = normalize_ocr_payload(parse_json_maybe(result["raw"]))
            return result
        except Exception as exc:
            if provider != "hybrid":
                return {"provider": "openai", "error": str(exc)}
    if provider in ("gemini", "hybrid") and gemini_key:
        try:
            result = ocr_gemini(image_path, gemini_model, gemini_key, max_output_tokens, use_base64)
            result["parsed"] = normalize_ocr_payload(parse_json_maybe(result["raw"]))
            return result
        except Exception as exc:
            return {"provider": "gemini", "error": str(exc)}
    return {"provider": provider, "error": "No provider key available"}


def preprocess_image(path: Path, grayscale: bool, autocontrast: bool, sharpen: bool) -> None:
    if not (grayscale or autocontrast or sharpen):
        return
    img = Image.open(path)
    if grayscale:
        img = img.convert("L")
    if autocontrast:
        img = ImageOps.autocontrast(img)
    if sharpen:
        img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))
    img.save(path)


def run_ocr_on_pdf(
    pdf_path: Path,
    out_dir: Path,
    provider: str,
    openai_key: Optional[str],
    gemini_key: Optional[str],
    openai_model: str,
    gemini_model: str,
    min_text_chars: int,
    max_pages_total: Optional[int],
    max_pages_per_doc: Optional[int],
    page_counter: List[int],
    image_scale: float,
    force_ocr: bool,
    max_output_tokens: int,
    preprocess_opts: Dict[str, bool],
    use_base64: bool,
    test_run_dir: Optional[Path],
    test_run_id: Optional[str],
    test_doc_slug: Optional[str],
) -> Dict[str, object]:
    out_dir.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(pdf_path)
    pages_out: List[Dict[str, object]] = []
    for page_index in range(doc.page_count):
        if max_pages_total and page_counter[0] >= max_pages_total:
            break
        if max_pages_per_doc and page_index >= max_pages_per_doc:
            break
        page = doc.load_page(page_index)
        text_layer = None if force_ocr else extract_text_layer(page, min_text_chars)
        if text_layer:
            page_payload = {
                "page": page_index + 1,
                "method": "text-layer",
                "result": normalize_ocr_payload({"text": text_layer, "markdown": text_layer}),
            }
            pages_out.append(page_payload)
            if test_run_dir and test_run_id and test_doc_slug:
                page_root = test_run_dir / test_run_id / test_doc_slug / f"page_{page_index + 1}"
                page_root.mkdir(parents=True, exist_ok=True)
                out_path = page_root / "text-layer.json"
                out_path.write_text(json.dumps({"provider": "text-layer", **page_payload}, indent=2))
            continue

        pix = page.get_pixmap(matrix=fitz.Matrix(image_scale, image_scale))
        image_path = out_dir / f"{pdf_path.stem}_page{page_index + 1}.png"
        pix.save(image_path)
        preprocess_image(
            image_path,
            grayscale=preprocess_opts.get("grayscale", False),
            autocontrast=preprocess_opts.get("autocontrast", False),
            sharpen=preprocess_opts.get("sharpen", False),
        )

        ocr_result = ocr_page(
            image_path=image_path,
            provider=provider,
            openai_key=openai_key,
            gemini_key=gemini_key,
            openai_model=openai_model,
            gemini_model=gemini_model,
            max_output_tokens=max_output_tokens,
            use_base64=use_base64,
        )
        pages_out.append(
            {
                "page": page_index + 1,
                "method": ocr_result.get("provider"),
                "result": ocr_result.get("parsed") or ocr_result,
                "error": ocr_result.get("error"),
                "usage": ocr_result.get("usage"),
            }
        )
        if test_run_dir and test_run_id and test_doc_slug:
            page_root = test_run_dir / test_run_id / test_doc_slug / f"page_{page_index + 1}"
            page_root.mkdir(parents=True, exist_ok=True)
            if ocr_result.get("provider") == "all":
                for idx, result in enumerate(ocr_result.get("results", [])):
                    provider_name = result.get("provider") or f"provider_{idx}"
                    out_path = page_root / f"{provider_name}.json"
                    out_path.write_text(json.dumps(result, indent=2, default=str))
            else:
                provider_name = ocr_result.get("provider") or "unknown"
                out_path = page_root / f"{provider_name}.json"
                out_path.write_text(json.dumps(ocr_result, indent=2, default=str))
        page_counter[0] += 1
    return {"pages": pages_out, "page_count": doc.page_count}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", required=True)
    parser.add_argument("--crawl-id", default=None)
    parser.add_argument("--url", default=None, help="Process a single PDF URL without running a crawl")
    parser.add_argument("--targets", nargs="*", default=[])
    parser.add_argument("--file-types", nargs="*", default=["pdf"])
    parser.add_argument("--max-docs", type=int, default=1000)
    parser.add_argument("--max-ocr-pages", type=int, default=150)
    parser.add_argument("--max-pages-per-doc", type=int, default=0, help="Limit OCR pages per document (0 = no limit)")
    parser.add_argument("--batch-pages", type=int, default=25, help="Max OCR pages per run to avoid timeouts")
    parser.add_argument("--max-runtime-seconds", type=int, default=0, help="Stop after this many seconds (0 = no limit)")
    parser.add_argument("--min-text-chars", type=int, default=120)
    parser.add_argument("--ocr-provider", choices=["openai", "gemini", "hybrid", "all"], default="hybrid")
    parser.add_argument("--openai-model", default=os.getenv("OPENAI_OCR_MODEL", "gpt-4o-mini"))
    parser.add_argument("--gemini-model", default=os.getenv("GEMINI_OCR_MODEL", "gemini-2.0-flash"))
    parser.add_argument("--ocr-dir", default=None, help="Override OCR output directory")
    parser.add_argument("--image-scale", type=float, default=2.5, help="Render scale for OCR (higher = clearer)")
    parser.add_argument("--force-ocr", action="store_true", help="Force OCR even if text layer is present")
    parser.add_argument("--max-output-tokens", type=int, default=2000, help="Max output tokens per OCR call")
    parser.add_argument("--grayscale", action="store_true", help="Convert pages to grayscale before OCR")
    parser.add_argument("--autocontrast", action="store_true", help="Autocontrast pages before OCR")
    parser.add_argument("--sharpen", action="store_true", help="Sharpen pages before OCR")
    parser.add_argument("--use-base64", action="store_true", help="Request base64 text fields in OCR output")
    parser.add_argument("--test-run", action="store_true", help="Write full OCR outputs into a test run folder")
    parser.add_argument("--test-run-id", default=None, help="Optional identifier for OCR test runs")
    parser.add_argument("--test-run-dir", default="data/ocr_tests", help="Base folder for OCR test outputs")
    parser.add_argument("--local-pdf-list", default=None, help="Path to a newline-delimited list of local PDF files")
    args = parser.parse_args()

    openai_key = os.getenv("OPENAI_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    gemini_input_price = float(os.getenv("GEMINI_INPUT_PRICE_PER_MILLION", "0.10"))
    gemini_output_price = float(os.getenv("GEMINI_OUTPUT_PRICE_PER_MILLION", "0.40"))

    crawl_id = args.crawl_id
    if args.local_pdf_list:
        crawl_id = "local"
        print("[crawl] using local PDF list")
    elif crawl_id:
        print(f"[crawl] using existing crawl_id={crawl_id}")
    elif args.url:
        crawl_id = "manual"
        print(f"[crawl] skipping crawl (single URL mode) crawl_id={crawl_id}")
    else:
        print("[crawl] submitting request...")
        crawl = submit_crawl(args.query, args.targets, args.file_types, args.max_docs)
        crawl_id = crawl.get("crawl_id")
        print(f"[crawl] crawl_id={crawl_id}")
        wait_for_completion(crawl_id)

    if args.local_pdf_list:
        documents = []
        list_path = Path(args.local_pdf_list)
        if list_path.exists():
            for line in list_path.read_text().splitlines():
                line = line.strip()
                if not line:
                    continue
                documents.append({"url": line})
        print(f"[crawl] local list documents={len(documents)}")
    elif args.url:
        documents = [{"url": args.url}]
        print("[crawl] single URL provided, skipping document fetch")
    else:
        print("[crawl] fetching discovered documents...")
        documents = fetch_documents(crawl_id, args.max_docs)
        print(f"[crawl] discovered={len(documents)}")

    raw_dir = Path("data") / "ingestion" / crawl_id / "raw"
    ocr_dir = Path(args.ocr_dir) if args.ocr_dir else (Path("data") / "ingestion" / crawl_id / "ocr")
    raw_dir.mkdir(parents=True, exist_ok=True)
    ocr_dir.mkdir(parents=True, exist_ok=True)

    downloaded: List[Tuple[str, Path]] = []
    if args.local_pdf_list:
        for doc in documents:
            url = doc.get("url") or ""
            path = Path(url)
            if path.exists() and path.suffix.lower() == ".pdf":
                downloaded.append((url, path))
        print(f"[download] local files={len(downloaded)}")
    else:
        for idx, doc in enumerate(documents, start=1):
            url = doc.get("url") or ""
            if not url.lower().startswith("http"):
                continue
            if args.file_types and not any(url.lower().endswith(ft) for ft in args.file_types):
                continue
            path = download_document(url, raw_dir, idx)
            if path:
                downloaded.append((url, path))

        print(f"[download] saved={len(downloaded)}")

    summary_path = ocr_dir / "summary.json"
    test_run_dir = Path(args.test_run_dir) if args.test_run else None
    test_run_id = args.test_run_id or time.strftime("%Y%m%d_%H%M%S")
    page_counter = [0]
    gemini_usage_total = {"prompt_tokens": 0, "output_tokens": 0, "total_tokens": 0}
    def hydrate_from_existing_outputs() -> None:
        nonlocal gemini_usage_total
        total_pages = 0
        prompt_total = 0
        output_total = 0
        total_total = 0
        for path in ocr_dir.glob("*.json"):
            if path.name == "summary.json":
                continue
            try:
                data = json.loads(path.read_text())
            except Exception:
                continue
            for page in data.get("pages", []):
                if page.get("method") != "gemini":
                    continue
                total_pages += 1
                usage = page.get("usage") or {}
                prompt_total += int(usage.get("promptTokenCount", 0) or 0)
                output_total += int(usage.get("candidatesTokenCount", 0) or 0)
                total_total += int(usage.get("totalTokenCount", 0) or 0)
        if total_pages > 0:
            page_counter[0] = total_pages
            gemini_usage_total = {
                "prompt_tokens": prompt_total,
                "output_tokens": output_total,
                "total_tokens": total_total,
            }

    hydrate_from_existing_outputs()
    start_time = time.time()

    def write_summary():
        gemini_cost = (
            gemini_usage_total["prompt_tokens"] / 1_000_000 * gemini_input_price
            + gemini_usage_total["output_tokens"] / 1_000_000 * gemini_output_price
        )
        summary = {
            "crawl_id": crawl_id,
            "documents_found": len(documents),
            "documents_downloaded": len(downloaded),
            "ocr_pages_processed": page_counter[0],
            "ocr_provider": args.ocr_provider,
            "openai_model": args.openai_model,
            "gemini_model": args.gemini_model,
            "gemini_usage": gemini_usage_total,
            "gemini_cost_usd": round(gemini_cost, 6),
            "batch_limit_pages": args.batch_pages,
            "max_pages_per_doc": args.max_pages_per_doc,
            "max_runtime_seconds": args.max_runtime_seconds,
        }
        summary_path.write_text(json.dumps(summary, indent=2))
    for url, pdf_path in downloaded:
        if args.max_ocr_pages and page_counter[0] >= args.max_ocr_pages:
            break
        if args.batch_pages and page_counter[0] >= args.batch_pages:
            break
        if args.max_runtime_seconds and (time.time() - start_time) > args.max_runtime_seconds:
            break
        if pdf_path.suffix.lower() != ".pdf":
            continue
        out_file = ocr_dir / f"{pdf_path.stem}.json"
        if out_file.exists():
            print(f"[ocr] skip {pdf_path.name} (already processed)")
            continue
        doc_slug = pdf_path.stem
        result = run_ocr_on_pdf(
            pdf_path=pdf_path,
            out_dir=ocr_dir,
            provider=args.ocr_provider,
            openai_key=openai_key,
            gemini_key=gemini_key,
            openai_model=args.openai_model,
            gemini_model=args.gemini_model,
            min_text_chars=args.min_text_chars,
            max_pages_total=args.max_ocr_pages,
            max_pages_per_doc=args.max_pages_per_doc or None,
            page_counter=page_counter,
            image_scale=args.image_scale,
            force_ocr=args.force_ocr,
            max_output_tokens=args.max_output_tokens,
            preprocess_opts={
                "grayscale": args.grayscale,
                "autocontrast": args.autocontrast,
                "sharpen": args.sharpen,
            },
            use_base64=args.use_base64,
            test_run_dir=test_run_dir,
            test_run_id=test_run_id if args.test_run else None,
            test_doc_slug=doc_slug if args.test_run else None,
        )
        out_file.write_text(json.dumps({"url": url, "file": str(pdf_path), **result}, indent=2))
        print(f"[ocr] {pdf_path.name} -> {out_file.name} (pages processed: {page_counter[0]})")
        # Aggregate Gemini usage when present
        for page in result.get("pages", []):
            if page.get("method") == "gemini":
                usage = page.get("usage") or {}
                prompt_tokens = int(usage.get("promptTokenCount", 0) or 0)
                output_tokens = int(usage.get("candidatesTokenCount", 0) or 0)
                total_tokens = int(usage.get("totalTokenCount", 0) or 0)
                gemini_usage_total["prompt_tokens"] += prompt_tokens
                gemini_usage_total["output_tokens"] += output_tokens
                gemini_usage_total["total_tokens"] += total_tokens
        write_summary()
    write_summary()
    print("[done] summary written to", ocr_dir / "summary.json")


if __name__ == "__main__":
    main()
