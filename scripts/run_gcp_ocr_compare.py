#!/usr/bin/env python3
"""
Compare GCP OCR options on a PDF:
- Document AI OCR processor
- Document AI Layout processor
- Cloud Vision document text detection (on rendered images)

Requires:
- GCP project + processors for Document AI
- Access token (gcloud ADC or env GOOGLE_OAUTH_ACCESS_TOKEN)
- Optional Vision API key (GOOGLE_API_KEY) or access token
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import subprocess
import time
from pathlib import Path
from typing import Dict, Optional, Tuple

import fitz
import httpx
from PIL import Image, ImageFilter, ImageOps


def slugify(text: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9._-]+", "_", text)
    return text.strip("_") or "document"


def get_access_token() -> Optional[str]:
    token = os.getenv("GOOGLE_OAUTH_ACCESS_TOKEN") or os.getenv("GOOGLE_ACCESS_TOKEN")
    if token:
        return token.strip()
    try:
        output = subprocess.check_output(
            ["gcloud", "auth", "application-default", "print-access-token"],
            stderr=subprocess.DEVNULL,
            text=True,
        )
        return output.strip()
    except Exception:
        return None


def download_pdf(url: str) -> bytes:
    with httpx.Client(timeout=60) as client:
        resp = client.get(url)
        resp.raise_for_status()
        return resp.content


def load_pdf_bytes(path: Optional[str], url: Optional[str]) -> bytes:
    if url:
        return download_pdf(url)
    if not path:
        raise ValueError("Provide --pdf-url or --pdf-path")
    return Path(path).read_bytes()


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


def render_pages(
    pdf_bytes: bytes,
    out_dir: Path,
    page_limit: int,
    scale: float,
    preprocess_opts: Dict[str, bool],
) -> Dict[int, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages: Dict[int, Path] = {}
    for idx in range(min(doc.page_count, page_limit)):
        page = doc.load_page(idx)
        pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale))
        path = out_dir / f"page_{idx + 1:03d}.png"
        pix.save(path)
        preprocess_image(path, **preprocess_opts)
        pages[idx + 1] = path
    return pages


def truncate_pdf(pdf_bytes: bytes, page_limit: int) -> bytes:
    if page_limit <= 0:
        return pdf_bytes
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    if doc.page_count <= page_limit:
        return pdf_bytes
    out = fitz.open()
    out.insert_pdf(doc, from_page=0, to_page=page_limit - 1)
    return out.tobytes()


def docai_process(
    pdf_bytes: bytes,
    project_id: str,
    location: str,
    processor_id: str,
    access_token: str,
) -> Dict[str, object]:
    url = (
        f"https://{location}-documentai.googleapis.com/v1/projects/{project_id}"
        f"/locations/{location}/processors/{processor_id}:process"
    )
    payload = {
        "rawDocument": {"content": base64.b64encode(pdf_bytes).decode("utf-8"), "mimeType": "application/pdf"}
    }
    with httpx.Client(timeout=120) as client:
        resp = client.post(url, json=payload, headers={"Authorization": f"Bearer {access_token}"})
        resp.raise_for_status()
        return resp.json()


def docai_text_length(response: Dict[str, object]) -> int:
    doc = response.get("document") or {}
    return len(doc.get("text") or "")


def vision_ocr_image(
    image_bytes: bytes,
    api_key: Optional[str],
    access_token: Optional[str],
    quota_project: Optional[str],
) -> Dict[str, object]:
    url = "https://vision.googleapis.com/v1/images:annotate"
    headers = {"Content-Type": "application/json"}
    if quota_project:
        headers["X-Goog-User-Project"] = quota_project
    if api_key:
        url = f"{url}?key={api_key}"
    elif access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    else:
        raise RuntimeError("Vision OCR requires GOOGLE_API_KEY or access token")
    payload = {
        "requests": [
            {
                "image": {"content": base64.b64encode(image_bytes).decode("utf-8")},
                "features": [{"type": "DOCUMENT_TEXT_DETECTION"}],
            }
        ]
    }
    with httpx.Client(timeout=60) as client:
        resp = client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        return resp.json()


def vision_text_length(response: Dict[str, object]) -> int:
    try:
        return len(response["responses"][0].get("fullTextAnnotation", {}).get("text", "") or "")
    except Exception:
        return 0


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf-url", default=None)
    parser.add_argument("--pdf-path", default=None)
    parser.add_argument("--project-id", default=os.getenv("GCP_PROJECT_ID"))
    parser.add_argument("--location", default=os.getenv("GCP_LOCATION", "us"))
    parser.add_argument("--docai-ocr-processor", default=os.getenv("GCP_DOCAI_OCR_PROCESSOR"))
    parser.add_argument("--docai-layout-processor", default=os.getenv("GCP_DOCAI_LAYOUT_PROCESSOR"))
    parser.add_argument("--page-limit", type=int, default=6)
    parser.add_argument("--image-scale", type=float, default=3.0)
    parser.add_argument("--grayscale", action="store_true")
    parser.add_argument("--autocontrast", action="store_true")
    parser.add_argument("--sharpen", action="store_true")
    parser.add_argument("--out-dir", default=None)
    args = parser.parse_args()

    pdf_bytes = load_pdf_bytes(args.pdf_path, args.pdf_url)
    slug = slugify(args.pdf_url or args.pdf_path or "document")
    out_dir = Path(args.out_dir) if args.out_dir else Path("data") / "ingestion" / "manual" / "gcp_compare" / slug
    out_dir.mkdir(parents=True, exist_ok=True)

    access_token = get_access_token()
    vision_api_key = os.getenv("GOOGLE_API_KEY")

    summary: Dict[str, object] = {"source": args.pdf_url or args.pdf_path, "results": {}}

    docai_pdf = truncate_pdf(pdf_bytes, args.page_limit)

    if args.project_id and args.docai_ocr_processor and access_token:
        start = time.time()
        response = docai_process(docai_pdf, args.project_id, args.location, args.docai_ocr_processor, access_token)
        duration = time.time() - start
        (out_dir / "docai_ocr.json").write_text(json.dumps(response, indent=2))
        summary["results"]["docai_ocr"] = {
            "text_length": docai_text_length(response),
            "duration_sec": round(duration, 2),
        }
    else:
        summary["results"]["docai_ocr"] = {"error": "Missing project/processor/token"}

    if args.project_id and args.docai_layout_processor and access_token:
        start = time.time()
        response = docai_process(docai_pdf, args.project_id, args.location, args.docai_layout_processor, access_token)
        duration = time.time() - start
        (out_dir / "docai_layout.json").write_text(json.dumps(response, indent=2))
        summary["results"]["docai_layout"] = {
            "text_length": docai_text_length(response),
            "duration_sec": round(duration, 2),
        }
    else:
        summary["results"]["docai_layout"] = {"error": "Missing project/processor/token"}

    pages = render_pages(
        pdf_bytes,
        out_dir / "vision_pages",
        args.page_limit,
        args.image_scale,
        {"grayscale": args.grayscale, "autocontrast": args.autocontrast, "sharpen": args.sharpen},
    )
    vision_total = 0
    vision_details = {}
    for page_num, img_path in pages.items():
        try:
            response = vision_ocr_image(img_path.read_bytes(), vision_api_key, access_token, args.project_id)
            (out_dir / f"vision_page_{page_num:03d}.json").write_text(json.dumps(response, indent=2))
            length = vision_text_length(response)
            vision_total += length
            vision_details[page_num] = {"text_length": length}
        except Exception as exc:
            message = str(exc)
            message = re.sub(r"(\\?.*)$", "", message) if "vision.googleapis.com" in message else message
            vision_details[page_num] = {"error": message}
    summary["results"]["vision"] = {"page_limit": len(pages), "text_length": vision_total, "pages": vision_details}

    (out_dir / "summary.json").write_text(json.dumps(summary, indent=2))
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
