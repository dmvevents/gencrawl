from __future__ import annotations

import json
import re
import os
import shutil
import time
import hashlib
import httpx
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

from utils.paths import get_log_dir, get_repo_root
from utils.settings_manager import get_settings_manager
from utils.gcp_vision import vision_ocr_pdf_bytes


YEAR_PATTERN = re.compile(r"(19|20)\d{2}")

DOC_TYPE_KEYWORDS = {
    "past_paper": ["past paper", "past-paper", "question paper", "question-paper", "exam paper"],
    "mark_scheme": ["mark scheme", "markscheme", "marking scheme", "marking guide"],
    "syllabus": ["syllabus", "specification", "course outline"],
    "curriculum": ["curriculum", "scheme of work", "lesson plan", "learning outcomes"],
    "practice": ["practice", "sample paper", "mock", "worked example"],
    "report": ["report", "bulletin", "guide", "manual", "handbook"],
}

LEVEL_KEYWORDS = {
    "primary": ["primary", "elementary", "grade 1", "grade 2", "grade 3", "standard 4", "standard 5"],
    "secondary": ["secondary", "high school", "form", "grade 7", "grade 8", "grade 9", "grade 10", "grade 11"],
    "post_secondary": ["advanced", "a-level", "cape", "unit 1", "unit 2", "associate degree"],
}

SUBJECT_KEYWORDS = {
    "mathematics": ["math", "mathematics", "algebra", "geometry", "statistics"],
    "english": ["english", "language arts", "literature", "reading", "writing"],
    "biology": ["biology", "life science"],
    "chemistry": ["chemistry"],
    "physics": ["physics"],
    "history": ["history"],
    "geography": ["geography"],
    "economics": ["economics"],
    "accounts": ["accounts", "accounting"],
    "computer_science": ["computer science", "information technology", "it", "ict"],
}

EXAM_KEYWORDS = {
    "csec": ["csec", "caribbean secondary education certificate"],
    "cape": ["cape", "caribbean advanced proficiency"],
    "ccslc": ["ccslc", "caribbean certificate of secondary level competence"],
    "sea": ["sea", "secondary entrance assessment"],
    "cxc": ["cxc", "caribbean examinations council"],
}


def _detect_keyword(value: str, keyword_map: Dict[str, List[str]]) -> Optional[str]:
    lowered = value.lower()
    for label, keywords in keyword_map.items():
        if any(keyword in lowered for keyword in keywords):
            return label
    return None


def _extract_year(value: str) -> Optional[int]:
    matches = YEAR_PATTERN.findall(value)
    if not matches:
        year_match = YEAR_PATTERN.search(value)
        if not year_match:
            return None
        return int(year_match.group(0))
    year_match = YEAR_PATTERN.search(value)
    return int(year_match.group(0)) if year_match else None


def _slugify(value: Optional[str]) -> str:
    if not value:
        return "unknown"
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return cleaned or "unknown"


def _stable_id(url: str, title: str) -> str:
    base = url or title or "unknown"
    return hashlib.sha1(base.encode("utf-8")).hexdigest()


def _normalize_url(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    try:
        parsed = urlparse(url)
        scheme = parsed.scheme.lower() or "https"
        netloc = parsed.netloc.lower()
        path = parsed.path or "/"
        # Remove tracking params and sort the rest for stable hashing
        query_params = [
            (k, v)
            for k, v in parse_qsl(parsed.query, keep_blank_values=True)
            if not k.lower().startswith("utm_")
            and k.lower() not in {"fbclid", "gclid", "mc_cid", "mc_eid"}
        ]
        query_params.sort()
        query = urlencode(query_params)
        normalized = urlunparse((scheme, netloc, path, "", query, ""))
        return normalized
    except Exception:
        return url


def _archive_root() -> Path:
    return get_repo_root() / "data" / "archive"


def _archive_index_path() -> Path:
    return _archive_root() / "index.jsonl"


def _load_archive_index() -> Dict[str, Dict[str, Any]]:
    index_path = _archive_index_path()
    entries: Dict[str, Dict[str, Any]] = {}
    if not index_path.exists():
        return entries
    with open(index_path, "r") as handle:
        for line in handle:
            if not line.strip():
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            entry_hash = entry.get("hash")
            if entry_hash:
                entries[entry_hash] = entry
    return entries


def _write_archive_index(entries: Dict[str, Dict[str, Any]]) -> None:
    root = _archive_root()
    root.mkdir(parents=True, exist_ok=True)
    index_path = _archive_index_path()
    sorted_entries = sorted(
        entries.values(),
        key=lambda e: (e.get("last_seen_at") or "", e.get("title") or ""),
        reverse=True,
    )
    with open(index_path, "w") as handle:
        for entry in sorted_entries:
            handle.write(json.dumps(entry) + "\n")


def _archive_hash_from_record(content_hash: Optional[str], normalized_url: Optional[str]) -> Optional[str]:
    if content_hash:
        return content_hash
    if normalized_url:
        return hashlib.sha1(normalized_url.encode("utf-8")).hexdigest()
    return None


def _infer_file_type(url: Optional[str], content_type: Optional[str]) -> str:
    if content_type:
        lowered = content_type.lower()
        if "pdf" in lowered:
            return "pdf"
        if "html" in lowered:
            return "html"
        if "text/plain" in lowered:
            return "txt"
    if url:
        ext = Path(urlparse(url).path).suffix.lower().lstrip(".")
        if ext:
            return ext
    return "unknown"


def _download_document(
    url: str,
    client: httpx.Client,
    max_size_bytes: int,
) -> Tuple[Optional[bytes], Dict[str, Any]]:
    meta: Dict[str, Any] = {"url": url, "error": None}
    try:
        head = client.head(url, follow_redirects=True)
        if head.status_code < 400:
            meta["content_type"] = head.headers.get("content-type")
            meta["etag"] = head.headers.get("etag")
            meta["last_modified"] = head.headers.get("last-modified")
            meta["final_url"] = str(head.url)
            meta["content_length"] = int(head.headers.get("content-length") or 0)
            if meta["content_length"] and meta["content_length"] > max_size_bytes:
                meta["error"] = "content_length_exceeds_limit"
                return None, meta
    except Exception:
        meta["head_failed"] = True

    try:
        response = client.get(url, follow_redirects=True)
        response.raise_for_status()
        meta["content_type"] = response.headers.get("content-type")
        meta["etag"] = response.headers.get("etag") or meta.get("etag")
        meta["last_modified"] = response.headers.get("last-modified") or meta.get("last_modified")
        meta["final_url"] = str(response.url)
        content_length = int(response.headers.get("content-length") or 0)
        if content_length and content_length > max_size_bytes:
            meta["error"] = "content_length_exceeds_limit"
            return None, meta
        content = response.content
        if len(content) > max_size_bytes:
            meta["error"] = "download_exceeds_limit"
            return None, meta
        meta["content_length"] = len(content)
        return content, meta
    except Exception as exc:
        meta["error"] = f"download_failed:{exc}"
        return None, meta


def _extract_text_from_bytes(
    file_type: str,
    content: bytes,
    max_chars: int,
) -> Tuple[str, str, Optional[str]]:
    if not content:
        return "", "none", "empty_content"
    if file_type == "pdf":
        ocr_provider = os.getenv("INGESTION_OCR_PROVIDER", "none").lower()
        min_chars_env = os.getenv("INGESTION_OCR_MIN_TEXT_CHARS", "").strip()
        min_chars = int(min_chars_env) if min_chars_env.isdigit() else 400
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(stream=content, filetype="pdf")
            text = "\n".join(page.get_text() for page in doc)
            if ocr_provider in {"vision", "auto"} and len(text.strip()) < min_chars:
                ocr_text, method, error = vision_ocr_pdf_bytes(content)
                if ocr_text:
                    return ocr_text[:max_chars], method, error
            return text[:max_chars], "pymupdf", None
        except Exception as exc:
            if ocr_provider in {"vision", "auto"}:
                ocr_text, method, error = vision_ocr_pdf_bytes(content)
                if ocr_text:
                    return ocr_text[:max_chars], method, error
            return "", "pymupdf", f"pdf_extract_failed:{exc}"
    if file_type in {"html", "htm"}:
        try:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(content, "html.parser")
            text = soup.get_text(separator=" ", strip=True)
            return text[:max_chars], "html", None
        except Exception as exc:
            return "", "html", f"html_extract_failed:{exc}"
    if file_type in {"txt", "text"}:
        try:
            text = content.decode("utf-8", errors="ignore")
            return text[:max_chars], "text", None
        except Exception as exc:
            return "", "text", f"text_extract_failed:{exc}"
    return "", "unsupported", "unsupported_type"


def _write_raw_file(
    raw_root: Path,
    base_name: str,
    file_type: str,
    content: bytes,
) -> Optional[str]:
    if not content:
        return None
    extension = file_type or "bin"
    if not extension.startswith("."):
        extension = f".{extension}"
    safe_name = _slugify(base_name) or "document"
    output_path = _ensure_unique_path(raw_root / f"{safe_name}{extension}")
    with open(output_path, "wb") as handle:
        handle.write(content)
    return str(output_path)


def _build_nemo_record(
    crawl_id: str,
    record: Dict[str, Any],
    raw_content: str,
    extraction_meta: Dict[str, Any],
) -> Dict[str, Any]:
    metadata = {
        "title": record.get("title"),
        "url": record.get("url"),
        "source_domain": record.get("source_domain"),
        "file_type": record.get("file_type"),
        "document_type": record.get("document_type"),
        "source_date": record.get("source_date"),
        "source_page": record.get("source_page"),
        "taxonomy": record.get("taxonomy"),
        "crawl_id": crawl_id,
        "content_type": record.get("content_type"),
        "last_modified": record.get("last_modified"),
        "extraction": extraction_meta,
        "metadata": record.get("metadata"),
    }
    return {
        "id": _stable_id(record.get("url") or "", record.get("title") or ""),
        "raw_content": raw_content or "",
        "metadata": metadata,
    }


def _curate_nemo_jsonl(
    input_path: Path,
    output_path: Path,
    quality_settings: Any,
) -> Dict[str, Any]:
    counts = {
        "input": 0,
        "kept": 0,
        "filtered": 0,
        "duplicates": 0,
        "short_text": 0,
        "missing_date": 0,
        "low_quality": 0,
    }
    seen_hashes: set[str] = set()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(input_path, "r") as handle_in, open(output_path, "w") as handle_out:
        for line in handle_in:
            if not line.strip():
                continue
            counts["input"] += 1
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                counts["filtered"] += 1
                continue

            raw_content = (record.get("raw_content") or "").strip()
            if quality_settings.min_text_length and len(raw_content) < quality_settings.min_text_length:
                counts["short_text"] += 1
                counts["filtered"] += 1
                continue

            metadata = record.get("metadata") or {}
            if quality_settings.require_date and not metadata.get("source_date"):
                counts["missing_date"] += 1
                counts["filtered"] += 1
                continue

            quality_score = metadata.get("quality_score")
            if quality_score is not None and quality_score < quality_settings.min_quality_score:
                counts["low_quality"] += 1
                counts["filtered"] += 1
                continue

            hash_basis = raw_content or (metadata.get("url") or "")
            hash_value = hashlib.sha1(hash_basis.encode("utf-8")).hexdigest()
            if hash_value in seen_hashes:
                counts["duplicates"] += 1
                counts["filtered"] += 1
                continue
            seen_hashes.add(hash_value)

            handle_out.write(json.dumps(record) + "\n")
            counts["kept"] += 1

    return counts


def _build_structure_path(structure: Optional[str], mapping: Dict[str, Any]) -> str:
    if not structure:
        return "unknown"
    path = structure
    if "{" in structure:
        for key, value in mapping.items():
            path = path.replace(f"{{{key}}}", _slugify(str(value) if value is not None else "unknown"))
        return path

    # Support token-style structures like "region/program/subject/year/"
    tokens = [t for t in structure.strip("/").split("/") if t]
    resolved: List[str] = []
    for token in tokens:
        if token in mapping:
            resolved.append(_slugify(str(mapping.get(token) or "unknown")))
        else:
            resolved.append(_slugify(token))
    return "/".join(resolved)


def _heuristic_outline(title: str, taxonomy: Dict[str, Any]) -> Dict[str, Any]:
    doc_type = taxonomy.get("document_type") or "document"
    sections: List[Dict[str, str]] = []

    if doc_type in {"past_paper", "practice"}:
        sections = [
            {"name": "Paper Overview", "notes": "Exam metadata and instructions."},
            {"name": "Section A", "notes": "Short-answer or multiple-choice questions."},
            {"name": "Section B", "notes": "Structured response questions."},
            {"name": "Section C", "notes": "Extended response or essays."},
            {"name": "Appendices", "notes": "Formula sheets or reference tables."},
        ]
    elif doc_type in {"mark_scheme"}:
        sections = [
            {"name": "Mark Allocation", "notes": "Point distribution per question."},
            {"name": "Worked Solutions", "notes": "Model answers and reasoning."},
            {"name": "Rubrics", "notes": "Grading criteria and notes."},
        ]
    elif doc_type in {"syllabus"}:
        sections = [
            {"name": "Rationale", "notes": "Purpose and scope of the syllabus."},
            {"name": "Content Areas", "notes": "Topics and learning objectives."},
            {"name": "Assessment", "notes": "Exam structure and weighting."},
            {"name": "Resources", "notes": "Recommended references and materials."},
        ]
    elif doc_type in {"curriculum"}:
        sections = [
            {"name": "Unit Overview", "notes": "Unit goals and outcomes."},
            {"name": "Learning Outcomes", "notes": "Targeted skills and knowledge."},
            {"name": "Activities", "notes": "Suggested learning activities."},
            {"name": "Assessment", "notes": "Evaluation methods and criteria."},
        ]
    else:
        sections = [
            {"name": "Summary", "notes": "High-level overview of the document."},
            {"name": "Key Topics", "notes": "Primary themes and sections."},
            {"name": "References", "notes": "Sources and supporting material."},
        ]

    return {
        "title": title,
        "document_type": doc_type,
        "program": taxonomy.get("program"),
        "subject": taxonomy.get("subject"),
        "year": taxonomy.get("year"),
        "sections": sections,
        "source": "heuristic",
    }


def _outline_prompt(title: str, url: str, taxonomy: Dict[str, Any]) -> str:
    return (
        "You are an education document analyst. Build a concise JSON outline for this document.\n\n"
        f"Title: {title}\n"
        f"URL: {url}\n"
        f"Taxonomy: {json.dumps(taxonomy)}\n\n"
        "Return JSON only with keys: title, document_type, program, subject, year, sections.\n"
        "sections is a list of {name, notes}. Keep it concise."
    )


def _llm_outline(title: str, url: str, taxonomy: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    provider = (os.getenv("INGESTION_OUTLINE_PROVIDER") or os.getenv("LLM_PROVIDER") or "").lower()
    if not provider or provider == "heuristic":
        return None
    if provider == "auto":
        if os.getenv("OPENAI_API_KEY"):
            provider = "openai"
        elif os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY"):
            provider = "google"
        elif os.getenv("ANTHROPIC_API_KEY"):
            provider = "anthropic"
        else:
            return None

    prompt = _outline_prompt(title, url, taxonomy)

    if provider == "openai":
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return None
        model = os.getenv("OPENAI_MODEL") or "gpt-4o-mini"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
            "max_tokens": 800,
        }
        import httpx
        with httpx.Client(timeout=30) as client:
            response = client.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload)
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        outline = json.loads(_extract_json(content))
        outline["source"] = "openai"
        return outline

    if provider in {"google", "gemini"}:
        api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not api_key:
            return None
        model = os.getenv("GEMINI_MODEL") or "gemini-1.5-flash"
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent?key={api_key}"
        )
        payload = {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 800},
        }
        import httpx
        with httpx.Client(timeout=30) as client:
            response = client.post(url, json=payload)
        response.raise_for_status()
        content = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        outline = json.loads(_extract_json(content))
        outline["source"] = "gemini"
        return outline

    if provider == "anthropic":
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            return None
        import anthropic
        model = os.getenv("ANTHROPIC_MODEL") or "claude-sonnet-4-5-20250929"
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model=model,
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}],
        )
        content = response.content[0].text
        outline = json.loads(_extract_json(content))
        outline["source"] = "anthropic"
        return outline

    return None


def _extract_json(content: str) -> str:
    if "```json" in content:
        return content.split("```json")[1].split("```")[0].strip()
    if "```" in content:
        return content.split("```")[1].split("```")[0].strip()
    return content.strip()


def _ensure_unique_path(base_path: Path) -> Path:
    if not base_path.exists():
        return base_path
    stem = base_path.stem
    suffix = base_path.suffix
    counter = 1
    while True:
        candidate = base_path.with_name(f"{stem}-{counter}{suffix}")
        if not candidate.exists():
            return candidate
        counter += 1


def _infer_taxonomy(title: str, url: str, config: Dict[str, Any]) -> Dict[str, Any]:
    merged = f"{title} {url}"
    doc_type = _detect_keyword(merged, DOC_TYPE_KEYWORDS)
    level = _detect_keyword(merged, LEVEL_KEYWORDS)
    subject = _detect_keyword(merged, SUBJECT_KEYWORDS)
    exam = _detect_keyword(merged, EXAM_KEYWORDS)
    year = _extract_year(merged)

    taxonomy_defaults = config.get("taxonomy", {}).get("defaults", {}) if config else {}
    taxonomy_hints = config.get("taxonomy", {}).get("hints", {}) if config else {}

    return {
        "authority": taxonomy_hints.get("authority"),
        "program": exam or taxonomy_hints.get("program"),
        "exam_board": exam or taxonomy_hints.get("exam_board"),
        "level": taxonomy_hints.get("level") or level,
        "subject": taxonomy_hints.get("subject") or subject,
        "year": taxonomy_hints.get("year") or year,
        "document_type": taxonomy_hints.get("document_type") or doc_type,
        "region": taxonomy_hints.get("region"),
        "language": taxonomy_hints.get("language") or taxonomy_defaults.get("language", "en"),
    }


def _extract_source_page_date(html: str) -> Optional[str]:
    patterns = [
        r'"datePublished"\s*:\s*"([^"]+)"',
        r'"dateModified"\s*:\s*"([^"]+)"',
        r'property="article:published_time"\s*content="([^"]+)"',
        r'property="article:modified_time"\s*content="([^"]+)"',
        r'name="pubdate"\s*content="([^"]+)"',
        r'name="publishdate"\s*content="([^"]+)"',
        r'name="date"\s*content="([^"]+)"',
        r'<time[^>]*datetime="([^"]+)"',
    ]
    for pattern in patterns:
        match = re.search(pattern, html, flags=re.IGNORECASE)
        if match:
            value = match.group(1)
            date_value = _extract_year(value)
            if date_value:
                return str(date_value)
            return value.strip()
    return None


def _fetch_source_page_metadata(
    url: str,
    client: httpx.Client,
    cache: Dict[str, Dict[str, Any]],
) -> Dict[str, Any]:
    if url in cache:
        return cache[url]
    try:
        response = client.get(url)
        if response.status_code != 200:
            cache[url] = {}
            return cache[url]
        html = response.text
        source_date = _extract_source_page_date(html)
        title_match = re.search(r"<title[^>]*>(.*?)</title>", html, flags=re.IGNORECASE | re.DOTALL)
        title = title_match.group(1).strip() if title_match else None
        cache[url] = {
            "source_page_date": source_date,
            "source_page_title": title,
        }
        return cache[url]
    except httpx.HTTPError:
        cache[url] = {}
        return cache[url]


def _parse_documents_from_log(log_path: Path) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    config: Dict[str, Any] = {}
    documents: List[Dict[str, Any]] = []

    if not log_path.exists():
        return documents, config

    with open(log_path, "r") as handle:
        for line in handle:
            try:
                event = json.loads(line.strip())
            except json.JSONDecodeError:
                continue

            if event.get("event_type") == "crawl_start":
                config = event.get("data", {}).get("config", {}) or {}

            if event.get("event_type") == "document_found":
                data = event.get("data", {})
                documents.append(
                    {
                        "title": data.get("title") or data.get("filename") or "Untitled Document",
                        "url": data.get("url", ""),
                        "file_type": data.get("file_type") or data.get("document_type") or "unknown",
                        "document_type": data.get("document_type"),
                        "file_size": data.get("file_size", 0),
                        "quality_score": data.get("quality_score", 0.0),
                        "tags": data.get("tags", []),
                        "source_date": data.get("source_date") or data.get("metadata", {}).get("source_date"),
                        "source_page": data.get("source_page") or data.get("metadata", {}).get("source_page"),
                        "content_type": data.get("content_type") or data.get("metadata", {}).get("content_type"),
                        "last_modified": data.get("last_modified") or data.get("metadata", {}).get("last_modified"),
                        "discovered_at": event.get("timestamp"),
                        "metadata": data.get("metadata", {}),
                        "crawl_id": event.get("crawl_id"),
                    }
                )

            if event.get("event_type") == "page_crawled":
                data = event.get("data", {})
                for doc in data.get("documents", []) or []:
                    documents.append(
                        {
                            "title": doc.get("title") or doc.get("filename") or "Untitled Document",
                            "url": doc.get("url", data.get("url", "")),
                            "file_type": doc.get("file_type", "html"),
                            "file_size": doc.get("file_size", 0),
                            "quality_score": doc.get("quality_score", 0.0),
                            "tags": doc.get("tags", []),
                            "discovered_at": event.get("timestamp"),
                            "metadata": doc.get("metadata", {}),
                            "crawl_id": event.get("crawl_id"),
                        }
                    )

    return documents, config


@dataclass
class IngestionResult:
    crawl_id: str
    ingested_count: int
    duplicate_count: int
    output_dir: Path
    manifest_path: Path

    def to_dict(self) -> Dict[str, Any]:
        return {
            "crawl_id": self.crawl_id,
            "ingested_count": self.ingested_count,
            "duplicate_count": self.duplicate_count,
            "output_dir": str(self.output_dir),
            "manifest_path": str(self.manifest_path),
        }


def ingest_crawl_from_logs(
    crawl_id: str,
    overwrite: bool = False,
    limit: Optional[int] = None,
    run_nemo_curator: Optional[bool] = None,
    curate: Optional[bool] = None,
    extract_text: Optional[bool] = None,
) -> IngestionResult:
    log_dir = get_log_dir()
    log_path = log_dir / f"crawl_{crawl_id}_events.jsonl"
    documents, config = _parse_documents_from_log(log_path)

    settings = get_settings_manager().get_settings()
    processing_settings = settings.processing
    output_settings = settings.output
    quality_settings = settings.quality
    limits_settings = settings.limits

    if run_nemo_curator is None:
        run_nemo_curator = processing_settings.run_nemo_curator
    if extract_text is None:
        extract_text = processing_settings.extract_text if run_nemo_curator else False
    if curate is None:
        curate = run_nemo_curator

    output_root = get_repo_root() / "data" / "ingestion" / crawl_id
    output_root.mkdir(parents=True, exist_ok=True)
    structured_root = output_root / "structured"
    raw_root = output_root / "raw"
    if output_settings.include_raw_files:
        raw_root.mkdir(parents=True, exist_ok=True)

    documents_path = output_root / "documents.jsonl"
    manifest_path = output_root / "manifest.json"
    nemo_output_path = output_root / "nemo_curator.jsonl"
    nemo_curated_path = output_root / "nemo_curated.jsonl"
    nv_ingest_manifest_path = output_root / "nv_ingest_manifest.json"

    if overwrite and documents_path.exists():
        documents_path.unlink()
    if overwrite and structured_root.exists():
        shutil.rmtree(structured_root)
    if overwrite and raw_root.exists():
        shutil.rmtree(raw_root)
        if output_settings.include_raw_files:
            raw_root.mkdir(parents=True, exist_ok=True)
    if overwrite and nemo_output_path.exists():
        nemo_output_path.unlink()
    if overwrite and nemo_curated_path.exists():
        nemo_curated_path.unlink()
    if overwrite and nv_ingest_manifest_path.exists():
        nv_ingest_manifest_path.unlink()
    structured_root.mkdir(parents=True, exist_ok=True)

    seen_urls = set()
    seen_dedupe_keys: Dict[str, str] = {}
    duplicate_map: Dict[str, List[str]] = {}
    archive_entries = _load_archive_index()
    archive_updates = 0
    ingested = 0
    duplicates = 0
    extraction_stats = {
        "attempted": 0,
        "succeeded": 0,
        "failed": 0,
        "skipped": 0,
    }
    raw_files: List[str] = []
    nemo_counts = {
        "records_written": 0,
    }

    default_structure = "region/program/level/subject/year/document_type/"
    output_structure = config.get("output", {}).get("structure") or default_structure
    output_tokens = [token for token in output_structure.strip("/").split("/") if token]
    if "program" not in output_tokens or "region" not in output_tokens:
        output_structure = default_structure
    outline_limit_env = os.getenv("INGESTION_OUTLINE_LIMIT", "").strip()
    outline_limit = int(outline_limit_env) if outline_limit_env.isdigit() else 0
    outline_calls = 0
    source_limit_env = os.getenv("INGESTION_SOURCE_LIMIT", "").strip()
    source_limit = int(source_limit_env) if source_limit_env.isdigit() else 0
    source_delay_env = os.getenv("INGESTION_SOURCE_DELAY", "").strip()
    source_delay = float(source_delay_env) if source_delay_env else 0.0
    source_calls = 0
    source_cache: Dict[str, Dict[str, Any]] = {}
    source_client = httpx.Client(timeout=10.0) if source_limit != 0 else None
    max_text_chars_env = os.getenv("INGESTION_MAX_TEXT_CHARS", "").strip()
    max_text_chars = int(max_text_chars_env) if max_text_chars_env.isdigit() else 1000000
    max_file_size_bytes = int(limits_settings.max_file_size_mb * 1024 * 1024)
    download_client = httpx.Client(timeout=20.0) if extract_text or run_nemo_curator else None
    supported_text_types = {"pdf", "html", "htm", "txt", "text"}

    nemo_handle = open(nemo_output_path, "a") if run_nemo_curator else None

    with open(documents_path, "a") as handle:
        for doc in documents[:limit] if limit else documents:
            url = doc.get("url", "")
            if url and url in seen_urls:
                duplicates += 1
                continue

            seen_urls.add(url)
            title = doc.get("title", "Untitled Document")
            taxonomy = _infer_taxonomy(title, url, config)
            domain = urlparse(url).netloc if url else None
            source_page = doc.get("source_page")
            source_meta: Dict[str, Any] = {}
            source_date = doc.get("source_date")
            if source_page and source_limit != 0:
                if source_limit < 0 or source_calls < source_limit:
                    if source_delay > 0:
                        time.sleep(source_delay)
                    source_meta = _fetch_source_page_metadata(source_page, source_client, source_cache)
                    source_calls += 1
                    if not source_date:
                        source_date = source_meta.get("source_page_date")
            structured_path = _build_structure_path(
                output_structure,
                {
                    "authority": taxonomy.get("authority"),
                    "program": taxonomy.get("program"),
                    "level": taxonomy.get("level"),
                    "subject": taxonomy.get("subject"),
                    "year": taxonomy.get("year"),
                    "document_type": taxonomy.get("document_type"),
                    "region": taxonomy.get("region"),
                    "source_domain": domain,
                },
            )

            file_type = doc.get("file_type") or _infer_file_type(url, doc.get("content_type"))
            extraction_meta = {
                "attempted": False,
                "method": None,
                "text_length": 0,
                "error": None,
                "content_length": None,
                "content_type": doc.get("content_type"),
            }
            raw_content = ""
            raw_file_path = None
            content_hash = None
            normalized_url = _normalize_url(url)
            download_meta: Dict[str, Any] = {}

            if (extract_text or run_nemo_curator) and download_client and url and file_type in supported_text_types:
                extraction_meta["attempted"] = True
                extraction_stats["attempted"] += 1
                content_bytes, download_meta = _download_document(url, download_client, max_file_size_bytes)
                extraction_meta["content_type"] = download_meta.get("content_type") or extraction_meta["content_type"]
                extraction_meta["content_length"] = download_meta.get("content_length")
                if content_bytes:
                    content_hash = hashlib.sha256(content_bytes).hexdigest()
                    raw_content, method, error = _extract_text_from_bytes(file_type, content_bytes, max_text_chars)
                    extraction_meta["method"] = method
                    extraction_meta["error"] = error
                    extraction_meta["text_length"] = len(raw_content)
                    if output_settings.include_raw_files:
                        raw_file_path = _write_raw_file(raw_root, title or url, file_type, content_bytes)
                    if raw_content:
                        extraction_stats["succeeded"] += 1
                    else:
                        extraction_stats["failed"] += 1
                else:
                    extraction_meta["error"] = download_meta.get("error")
                    extraction_stats["failed"] += 1
            else:
                extraction_stats["skipped"] += 1

            outline = None
            if outline_limit == 0 or outline_calls < outline_limit:
                try:
                    outline = _llm_outline(title, url, taxonomy)
                except Exception:
                    outline = None
                if outline:
                    outline_calls += 1
            if outline and not outline.get("sections"):
                outline = _heuristic_outline(title, taxonomy)
                outline["llm_fallback_reason"] = "empty_sections"
            if not outline:
                outline = _heuristic_outline(title, taxonomy)

            record = {
                **doc,
                "source_domain": domain,
                "taxonomy": taxonomy,
                "structured_path": structured_path,
                "file_type": file_type,
                "metadata": {
                    **(doc.get("metadata") or {}),
                    "outline": outline,
                    "source_page_date": source_meta.get("source_page_date"),
                    "source_page_title": source_meta.get("source_page_title"),
                    "extraction": extraction_meta,
                    "url_normalized": normalized_url,
                    "content_hash": content_hash,
                    "content_length": extraction_meta.get("content_length"),
                    "etag": download_meta.get("etag"),
                    "last_modified": download_meta.get("last_modified"),
                    "final_url": download_meta.get("final_url"),
                },
                "source_date": source_date,
                "source_page": source_page,
            }
            if raw_content:
                record["content"] = raw_content
                record["content_markdown"] = raw_content
            if extraction_meta.get("content_type") and not record.get("content_type"):
                record["content_type"] = extraction_meta["content_type"]
            if raw_file_path:
                record["metadata"]["raw_file_path"] = raw_file_path
                raw_files.append(raw_file_path)

            dedupe_key = None
            if content_hash:
                dedupe_key = f"hash:{content_hash}"
            elif normalized_url:
                dedupe_key = f"url:{normalized_url}"
            if dedupe_key:
                canonical = seen_dedupe_keys.get(dedupe_key)
                if canonical:
                    duplicates += 1
                    record["metadata"]["is_duplicate"] = True
                    record["metadata"]["duplicate_of"] = canonical
                    duplicate_map.setdefault(canonical, []).append(url)
                else:
                    seen_dedupe_keys[dedupe_key] = url

            archive_hash = _archive_hash_from_record(content_hash, normalized_url)
            if archive_hash:
                now = datetime.utcnow().isoformat() + "Z"
                entry = archive_entries.get(archive_hash)
                domains = {domain} if domain else set()
                if entry:
                    entry["last_seen_at"] = now
                    if url:
                        urls = entry.get("urls", [])
                        if url not in urls:
                            urls.append(url)
                            entry["urls"] = urls
                    if domain:
                        entry_domains = set(entry.get("source_domains", []))
                        entry_domains.add(domain)
                        entry["source_domains"] = sorted(entry_domains)
                    crawl_ids = set(entry.get("crawl_ids", []))
                    crawl_ids.add(crawl_id)
                    entry["crawl_ids"] = sorted(crawl_ids)
                    entry["url_count"] = len(entry.get("urls", []))
                else:
                    archive_entries[archive_hash] = {
                        "hash": archive_hash,
                        "hash_basis": "content_hash" if content_hash else "url_normalized",
                        "canonical_url": url,
                        "urls": [url] if url else [],
                        "url_count": 1 if url else 0,
                        "title": title,
                        "file_type": file_type,
                        "file_size": doc.get("file_size", 0),
                        "source_date": source_date,
                        "taxonomy": taxonomy,
                        "structured_path": structured_path,
                        "source_domains": sorted(domains),
                        "first_seen_at": now,
                        "last_seen_at": now,
                        "crawl_ids": [crawl_id],
                        "quality_score": doc.get("quality_score", 0.0),
                    }
                archive_updates += 1

            # Write structured document files
            structured_dir = structured_root / structured_path
            structured_dir.mkdir(parents=True, exist_ok=True)
            url_slug = _slugify(urlparse(url).path) if url else ""
            base_name = url_slug or _slugify(title) or f"document-{ingested + 1}"
            record_path = _ensure_unique_path(structured_dir / f"{base_name}.json")
            outline_path = record_path.with_name(f"{record_path.stem}.outline.json")
            text_path = record_path.with_name(f"{record_path.stem}.text.txt")
            markdown_path = record_path.with_name(f"{record_path.stem}.content.md")
            record["metadata"]["structured_file_path"] = str(record_path.relative_to(output_root))
            record["metadata"]["outline_file_path"] = str(outline_path.relative_to(output_root))
            if raw_content:
                record["metadata"]["extracted_text_path"] = str(text_path.relative_to(output_root))
                record["metadata"]["content_markdown_path"] = str(markdown_path.relative_to(output_root))

            handle.write(json.dumps(record) + "\n")
            ingested += 1

            with open(record_path, "w") as record_handle:
                json.dump(record, record_handle, indent=2)
            with open(outline_path, "w") as outline_handle:
                json.dump(outline, outline_handle, indent=2)
            if raw_content:
                with open(text_path, "w") as text_handle:
                    text_handle.write(raw_content)
                with open(markdown_path, "w") as markdown_handle:
                    markdown_handle.write(raw_content)

            if nemo_handle is not None:
                nemo_record = _build_nemo_record(crawl_id, record, raw_content, extraction_meta)
                nemo_handle.write(json.dumps(nemo_record) + "\n")
                nemo_counts["records_written"] += 1

    manifest = {
        "crawl_id": crawl_id,
        "created_at": datetime.utcnow().isoformat() + "Z",
        "source": "logs",
        "log_path": str(log_path),
        "output": {
            "documents_jsonl": str(documents_path),
            "manifest": str(manifest_path),
            "structured_root": str(structured_root),
        },
        "counts": {
            "ingested": ingested,
            "duplicates": duplicates,
            "source_documents": len(documents),
        },
        "dedupe": {
            "strategy": "content_hash_or_normalized_url",
            "duplicates": duplicate_map,
        },
        "archive": {
            "index_path": str(_archive_index_path()),
            "updated_entries": archive_updates,
        },
        "taxonomy": config.get("taxonomy", {}),
        "output_structure": output_structure,
        "outline": {
            "provider": os.getenv("INGESTION_OUTLINE_PROVIDER") or os.getenv("LLM_PROVIDER") or "heuristic",
            "limit": outline_limit,
            "llm_calls": outline_calls,
        },
        "source_pages": {
            "limit": source_limit,
            "calls": source_calls,
        },
        "nemo": {
            "enabled": run_nemo_curator,
            "nemo_curator_jsonl": str(nemo_output_path) if run_nemo_curator else None,
            "nemo_curated_jsonl": None,
            "counts": nemo_counts,
            "extraction": extraction_stats,
            "curation": None,
            "nv_ingest_manifest": None,
        },
    }

    if run_nemo_curator and nemo_handle is not None:
        nemo_handle.close()

    if run_nemo_curator and curate and nemo_output_path.exists():
        curation_counts = _curate_nemo_jsonl(nemo_output_path, nemo_curated_path, quality_settings)
        manifest["nemo"]["nemo_curated_jsonl"] = str(nemo_curated_path)
        manifest["nemo"]["curation"] = curation_counts

    if raw_files:
        nv_ingest_manifest = {
            "crawl_id": crawl_id,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "files": raw_files,
            "options": {
                "extract_text": processing_settings.extract_text,
                "extract_tables": processing_settings.extract_tables,
                "extract_images": processing_settings.extract_images,
                "run_ocr": processing_settings.run_ocr,
                "chunk_size": int(os.getenv("NV_INGEST_CHUNK_SIZE", "1024")),
                "chunk_overlap": int(os.getenv("NV_INGEST_CHUNK_OVERLAP", "150")),
                "pdf_extract_method": os.getenv("NV_INGEST_PDF_EXTRACT_METHOD", "None"),
                "text_depth": os.getenv("NV_INGEST_TEXT_DEPTH", "page"),
            },
            "env": {
                "NV_INGEST_HOST": os.getenv("NV_INGEST_HOST", ""),
                "NV_INGEST_PORT": os.getenv("NV_INGEST_PORT", ""),
            },
        }
        with open(nv_ingest_manifest_path, "w") as handle:
            json.dump(nv_ingest_manifest, handle, indent=2)
        manifest["nemo"]["nv_ingest_manifest"] = str(nv_ingest_manifest_path)

    with open(manifest_path, "w") as handle:
        json.dump(manifest, handle, indent=2)

    if archive_updates:
        _write_archive_index(archive_entries)

    if source_client:
        source_client.close()
    if download_client:
        download_client.close()

    return IngestionResult(
        crawl_id=crawl_id,
        ingested_count=ingested,
        duplicate_count=duplicates,
        output_dir=output_root,
        manifest_path=manifest_path,
    )


def curate_ingestion_output(crawl_id: str) -> Dict[str, Any]:
    output_root = get_repo_root() / "data" / "ingestion" / crawl_id
    nemo_output_path = output_root / "nemo_curator.jsonl"
    nemo_curated_path = output_root / "nemo_curated.jsonl"
    if not nemo_output_path.exists():
        raise FileNotFoundError("Nemo curator JSONL not found. Run ingestion with run_nemo_curator=true.")

    settings = get_settings_manager().get_settings()
    counts = _curate_nemo_jsonl(nemo_output_path, nemo_curated_path, settings.quality)

    manifest_path = output_root / "manifest.json"
    if manifest_path.exists():
        with open(manifest_path, "r") as handle:
            manifest = json.load(handle)
        manifest.setdefault("nemo", {})
        manifest["nemo"]["nemo_curated_jsonl"] = str(nemo_curated_path)
        manifest["nemo"]["curation"] = counts
        with open(manifest_path, "w") as handle:
            json.dump(manifest, handle, indent=2)

    return {
        "crawl_id": crawl_id,
        "nemo_curated_jsonl": str(nemo_curated_path),
        "counts": counts,
    }
