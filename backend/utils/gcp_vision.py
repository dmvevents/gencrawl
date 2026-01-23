"""Helpers for Google Cloud Vision OCR."""

from __future__ import annotations

import base64
import json
import os
from typing import Optional, Tuple

import fitz
import httpx
from PIL import Image, ImageFilter, ImageOps


def _preprocess_image(path: str, grayscale: bool, autocontrast: bool, sharpen: bool) -> None:
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


def _vision_request(image_bytes: bytes, api_key: Optional[str], access_token: Optional[str], quota_project: Optional[str]) -> dict:
    url = "https://vision.googleapis.com/v1/images:annotate"
    headers = {"Content-Type": "application/json"}
    if api_key:
        url = f"{url}?key={api_key}"
    elif access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    else:
        raise RuntimeError("Vision OCR requires GOOGLE_API_KEY or GOOGLE_OAUTH_ACCESS_TOKEN")
    if quota_project:
        headers["X-Goog-User-Project"] = quota_project
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


def _load_adc_access_token() -> Optional[str]:
    credentials_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not credentials_path:
        return None
    try:
        with open(credentials_path, "r") as handle:
            data = json.load(handle)
    except Exception:
        return None
    if data.get("type") != "authorized_user":
        return None
    refresh_token = data.get("refresh_token")
    client_id = data.get("client_id")
    client_secret = data.get("client_secret")
    token_uri = data.get("token_uri") or "https://oauth2.googleapis.com/token"
    if not (refresh_token and client_id and client_secret):
        return None
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(
                token_uri,
                data={
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
            )
            resp.raise_for_status()
            return resp.json().get("access_token")
    except Exception:
        return None


def vision_ocr_pdf_bytes(pdf_bytes: bytes) -> Tuple[str, str, Optional[str]]:
    """Run Vision OCR for a PDF by rendering pages to images and concatenating text."""
    api_key = os.getenv("GOOGLE_API_KEY")
    access_token = os.getenv("GOOGLE_OAUTH_ACCESS_TOKEN") or _load_adc_access_token()
    quota_project = os.getenv("GCP_PROJECT_ID") or os.getenv("GOOGLE_CLOUD_PROJECT")

    page_limit_env = os.getenv("INGESTION_VISION_PAGE_LIMIT", "").strip()
    scale_env = os.getenv("INGESTION_VISION_SCALE", "").strip()
    grayscale = os.getenv("INGESTION_VISION_GRAYSCALE", "true").lower() == "true"
    autocontrast = os.getenv("INGESTION_VISION_AUTOCONTRAST", "true").lower() == "true"
    sharpen = os.getenv("INGESTION_VISION_SHARPEN", "true").lower() == "true"

    page_limit = int(page_limit_env) if page_limit_env.isdigit() else 30
    scale = float(scale_env) if scale_env else 3.0

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    combined_text = []
    processed = 0

    for index in range(doc.page_count):
        if page_limit and processed >= page_limit:
            break
        page = doc.load_page(index)
        pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale))
        image_path = f"/tmp/gencrawl_vision_page_{index + 1}.png"
        pix.save(image_path)
        _preprocess_image(image_path, grayscale, autocontrast, sharpen)
        with open(image_path, "rb") as handle:
            response = _vision_request(handle.read(), api_key, access_token, quota_project)
        text = ""
        try:
            text = response["responses"][0].get("fullTextAnnotation", {}).get("text", "") or ""
        except Exception:
            text = ""
        if text:
            combined_text.append(text.strip())
        processed += 1

    if not combined_text:
        return "", "vision-ocr", "no_text_extracted"
    return "\n\n".join(combined_text), "vision-ocr", None
