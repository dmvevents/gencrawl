from __future__ import annotations

import json
import re
import time
import xml.etree.ElementTree as ET
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple
from urllib.parse import urljoin, urlparse, urlencode

import httpx
import asyncio

from utils.paths import get_repo_root


def _discovery_user_agent() -> str:
    return os.getenv("DISCOVERY_USER_AGENT", USER_AGENT)


USER_AGENT = "GenCrawl/1.0 (+https://gencrawl.local)"
CACHE_TTL_SECONDS = 7 * 24 * 60 * 60

DOC_TYPE_ALIASES = {
    "past paper": "past_paper",
    "past papers": "past_paper",
    "specimen paper": "past_paper",
    "specimen papers": "past_paper",
    "mark scheme": "mark_scheme",
    "mark schemes": "mark_scheme",
    "markscheme": "mark_scheme",
    "practice": "practice",
    "practice test": "practice",
    "practice tests": "practice",
    "sample paper": "practice",
    "sample papers": "practice",
    "mock": "practice",
    "curriculum": "curriculum",
    "syllabus": "syllabus",
    "registration": "registration_notice",
    "registration notice": "registration_notice",
    "notice": "notice",
    "newsletter": "newsletter",
    "results": "results",
    "timetable": "timetable",
    "guidance": "guidance",
    "report": "report",
}

DEFAULT_DOMAIN_PROFILES: Dict[str, Dict[str, Any]] = {
    "www.cxc.org": {
        "allow_paths": ["/syllabus-downloads", "/specimen-papers", "/examinations", "/product", "/wp-content/uploads"],
        "crawl_delay": 1.0,
    },
    "moe.gov.tt": {
        "allow_paths": ["/sea", "/searesults", "/curriculum-resources", "/wp-content/uploads"],
        "crawl_delay": 1.0,
    },
    "storage.moe.gov.tt": {
        "allow_paths": ["/"],
        "respect_robots": False,
        "crawl_delay": 0.5,
    },
    "wpuploadstorageaccount.blob.core.windows.net": {
        "allow_paths": ["/"],
        "respect_robots": False,
        "crawl_delay": 0.5,
    },
}


@dataclass
class RobotsPolicy:
    disallow: List[str]
    crawl_delay: Optional[int]
    sitemaps: List[str]

    def allows(self, url: str) -> bool:
        path = urlparse(url).path
        for rule in self.disallow:
            if not rule:
                continue
            if path.startswith(rule):
                return False
        return True


@dataclass
class DiscoveryResult:
    documents: List[Dict[str, Any]]
    checked_urls: int
    skipped_urls: int
    used_sitemaps: List[str]


class DomainRequestor:
    def __init__(self, client: httpx.AsyncClient, delays: Dict[str, float]):
        self.client = client
        self.delays = delays
        self.last_request: Dict[str, float] = {}

    async def _wait(self, url: str) -> None:
        host = urlparse(url).netloc
        delay = self.delays.get(host, 0.0)
        if delay <= 0:
            return
        now = time.monotonic()
        last = self.last_request.get(host)
        if last is not None:
            wait_for = delay - (now - last)
            if wait_for > 0:
                await asyncio.sleep(wait_for)
        self.last_request[host] = time.monotonic()

    async def get(self, url: str, **kwargs) -> httpx.Response:
        await self._wait(url)
        return await self.client.get(url, **kwargs)

    async def head(self, url: str, **kwargs) -> httpx.Response:
        await self._wait(url)
        return await self.client.head(url, **kwargs)


def _cache_path() -> Path:
    return get_repo_root() / "data" / "cache" / "url_status.json"


def _load_url_cache() -> Dict[str, Dict[str, Any]]:
    path = _cache_path()
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        return {}


def _save_url_cache(cache: Dict[str, Dict[str, Any]]) -> None:
    path = _cache_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(cache, indent=2))


def _cache_fresh(entry: Dict[str, Any]) -> bool:
    timestamp = entry.get("timestamp")
    if not timestamp:
        return False
    return (time.time() - timestamp) < CACHE_TTL_SECONDS


def _parse_robots_txt(content: str) -> RobotsPolicy:
    disallow: List[str] = []
    sitemaps: List[str] = []
    crawl_delay: Optional[int] = None

    active_agent = False
    for raw_line in content.splitlines():
        line = raw_line.split("#", 1)[0].strip()
        if not line:
            continue
        if line.lower().startswith("user-agent:"):
            agent = line.split(":", 1)[1].strip()
            active_agent = agent == "*"  # Only honor global section
            continue
        if line.lower().startswith("sitemap:"):
            sitemap = line.split(":", 1)[1].strip()
            if sitemap:
                sitemaps.append(sitemap)
            continue
        if not active_agent:
            continue
        if line.lower().startswith("disallow:"):
            path = line.split(":", 1)[1].strip()
            disallow.append(path)
        elif line.lower().startswith("crawl-delay:"):
            value = line.split(":", 1)[1].strip()
            if value.isdigit():
                crawl_delay = int(value)

    return RobotsPolicy(disallow=disallow, crawl_delay=crawl_delay, sitemaps=sitemaps)

def _path_allowed(url: str, profile: Dict[str, Any]) -> bool:
    path = urlparse(url).path or "/"
    allow_paths = profile.get("allow_paths") or []
    if allow_paths and not any(path.startswith(p) for p in allow_paths):
        return False
    disallow_paths = profile.get("disallow_paths") or []
    if any(path.startswith(p) for p in disallow_paths):
        return False
    return True


async def _fetch_robots(base_url: str, requestor: DomainRequestor) -> RobotsPolicy:
    parsed = urlparse(base_url)
    root = f"{parsed.scheme}://{parsed.netloc}/" if parsed.scheme and parsed.netloc else base_url
    robots_url = urljoin(root, "robots.txt")
    try:
        response = await requestor.get(robots_url)
        if response.status_code == 200:
            return _parse_robots_txt(response.text)
    except httpx.HTTPError:
        pass
    return RobotsPolicy(disallow=[], crawl_delay=None, sitemaps=[])


def _parse_sitemap_xml(content: str) -> Tuple[List[str], bool]:
    entries: List[Dict[str, Optional[str]]] = []
    try:
        root = ET.fromstring(content)
    except ET.ParseError:
        return [], False

    tag = root.tag.lower()
    is_index = tag.endswith("sitemapindex")

    if is_index:
        for sitemap in root.findall(".//{*}sitemap"):
            loc = sitemap.find("{*}loc")
            if loc is not None and loc.text:
                entries.append({"loc": loc.text.strip(), "lastmod": None})
    else:
        for url in root.findall(".//{*}url"):
            loc = url.find("{*}loc")
            if loc is None or not loc.text:
                continue
            lastmod_node = url.find("{*}lastmod")
            entries.append(
                {
                    "loc": loc.text.strip(),
                    "lastmod": lastmod_node.text.strip() if lastmod_node is not None and lastmod_node.text else None,
                }
            )

    return entries, is_index


async def _fetch_sitemap_urls(
    sitemap_url: str,
    requestor: DomainRequestor,
    max_urls: int,
) -> Tuple[List[Dict[str, Optional[str]]], bool]:
    try:
        response = await requestor.get(sitemap_url, follow_redirects=True)
        if response.status_code != 200:
            return [], False
        urls, is_index = _parse_sitemap_xml(response.text)
        return urls[:max_urls], is_index
    except httpx.HTTPError:
        return [], False


def _wp_media_mime_types(file_types: Iterable[str], overrides: Optional[Iterable[str]] = None) -> List[str]:
    if overrides:
        return [mime for mime in overrides if mime]
    types = {ft.lower().lstrip(".") for ft in (file_types or [])}
    mime_types = {"application/pdf"}
    if "doc" in types:
        mime_types.add("application/msword")
    if "docx" in types:
        mime_types.add("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    return sorted(mime_types)


async def _fetch_wp_media(
    base_url: str,
    requestor: DomainRequestor,
    max_pages: int,
    max_items: int,
    mime_types: Iterable[str],
) -> List[Dict[str, Optional[str]]]:
    if max_pages <= 0 or max_items <= 0:
        return []
    parsed = urlparse(base_url)
    if not parsed.scheme or not parsed.netloc:
        return []
    root = f"{parsed.scheme}://{parsed.netloc}"
    results: List[Dict[str, Optional[str]]] = []
    for mime_type in mime_types:
        page = 1
        while page <= max_pages and len(results) < max_items:
            params = urlencode({"per_page": 100, "mime_type": mime_type, "page": page})
            url = f"{root}/wp-json/wp/v2/media?{params}"
            try:
                response = await requestor.get(url, follow_redirects=True)
                if response.status_code != 200:
                    break
                items = response.json()
                if not isinstance(items, list) or not items:
                    break
                for item in items:
                    if not isinstance(item, dict):
                        continue
                    source_url = item.get("source_url") or (item.get("guid") or {}).get("rendered")
                    if not source_url:
                        continue
                    results.append(
                        {
                            "url": source_url,
                            "source_date": item.get("date") or item.get("modified"),
                            "source_page": item.get("link"),
                        }
                    )
                    if len(results) >= max_items:
                        break
                page += 1
            except (httpx.HTTPError, ValueError):
                break
    return results


def _extract_links(html: str) -> List[str]:
    return re.findall(r'href=["\'](.*?)["\']', html, flags=re.IGNORECASE)


def _normalize_keywords(keywords: Iterable[str]) -> List[str]:
    tokens: List[str] = []
    for keyword in keywords:
        tokens.extend(re.findall(r"[a-z0-9]+", str(keyword).lower()))
    normalized: List[str] = []
    for token in tokens:
        if not token:
            continue
        normalized.append(token)
        if token == "syllabi":
            normalized.append("syllabus")
        if token.endswith("s") and len(token) > 4:
            normalized.append(token[:-1])
    return list(dict.fromkeys(normalized))


def _normalize_doc_types(types: Iterable[str]) -> List[str]:
    normalized: List[str] = []
    for value in types:
        if not value:
            continue
        lowered = str(value).strip().lower()
        normalized.append(DOC_TYPE_ALIASES.get(lowered, lowered))
    return list(dict.fromkeys(normalized))


def _matches_keywords(value: str, keywords: Iterable[str]) -> bool:
    tokens = _normalize_keywords(keywords)
    if not tokens:
        return True
    lowered = value.lower()
    return any(token in lowered for token in tokens)


def _keyword_value(url: str) -> str:
    parsed = urlparse(url)
    return f"{parsed.path} {parsed.query}".strip()


def _matches_file_types(url: str, content_type: str, file_types: Iterable[str]) -> bool:
    if not file_types:
        return True
    lowered_url = url.lower()
    lowered_type = content_type.lower() if content_type else ""
    for ext in file_types:
        ext = ext.lower().lstrip(".")
        if f".{ext}" in lowered_url:
            return True
        if ext and ext in lowered_type:
            return True
    return False


def _title_from_url(url: str) -> str:
    path = urlparse(url).path
    name = Path(path).stem
    if not name:
        return "Untitled Document"
    return name.replace("-", " ").replace("_", " ").strip().title()


def _extract_date(value: str) -> Optional[str]:
    if not value:
        return None
    text = value
    match = re.search(r"(19|20)\d{2}[-_/](0[1-9]|1[0-2])[-_/](0[1-9]|[12]\\d|3[01])", text)
    if match:
        return match.group(0).replace("_", "-").replace("/", "-")
    year_match = re.search(r"(19|20)\d{2}", text)
    if year_match:
        return year_match.group(0)
    return None


def _document_type_from_url(url: str) -> str:
    lowered = url.lower()
    if "registration" in lowered:
        return "registration_notice"
    if "notice" in lowered:
        return "notice"
    if "mark" in lowered and "scheme" in lowered:
        return "mark_scheme"
    if "syllabus" in lowered:
        return "syllabus"
    if "curriculum" in lowered or "scheme-of-work" in lowered or "curriculum-guide" in lowered:
        return "curriculum"
    if "guide" in lowered and "curriculum" in lowered:
        return "curriculum"
    if "practice" in lowered or "sample" in lowered or "mock" in lowered:
        return "practice"
    if "past" in lowered and "paper" in lowered:
        return "past_paper"
    if "specimen" in lowered:
        return "past_paper"
    if "specimen" in lowered and "paper" in lowered:
        return "past_paper"
    if "paper" in lowered:
        return "past_paper"
    return "document"


def _subject_terms_from_keywords(keywords: Iterable[str]) -> List[str]:
    terms: Set[str] = set()
    normalized = _normalize_keywords(keywords)
    for token in normalized:
        if token in {"math", "maths", "mathematics"}:
            terms.update({"math", "maths", "mathematics"})
        if token in {"english"}:
            terms.update({"english", "language-arts", "languagearts"})
        if token in {"language-arts", "languagearts"}:
            terms.update({"language-arts", "languagearts"})
    return list(terms)


def _subject_terms_from_config(config: Dict[str, Any]) -> List[str]:
    hints = (config.get("taxonomy") or {}).get("hints") or {}
    subject = hints.get("subject")
    if not subject:
        return []
    return _normalize_keywords([subject])


def _program_terms_from_keywords(keywords: Iterable[str]) -> List[str]:
    terms: Set[str] = set()
    normalized = _normalize_keywords(keywords)
    for token in normalized:
        if token in {"csec", "cxc", "ccslc", "cape", "sea"}:
            terms.add(token)
    return list(terms)


def _program_terms_from_config(config: Dict[str, Any]) -> List[str]:
    hints = (config.get("taxonomy") or {}).get("hints") or {}
    program = hints.get("program")
    if not program:
        return []
    return _normalize_keywords([program])


def _document_type_from_context(url: str, source_url: Optional[str]) -> str:
    doc_type = _document_type_from_url(url)
    if doc_type != "document":
        return doc_type
    if source_url:
        context_type = _document_type_from_url(source_url)
        if context_type != "document":
            return context_type
    return doc_type


def _matches_program(url: str, title: str, program_terms: Iterable[str]) -> bool:
    terms = list(program_terms)
    if not terms:
        return True
    haystack = f"{_keyword_value(url)} {title}".lower()
    return any(term in haystack for term in terms)


def _doc_type_allowlist_from_keywords(keywords: Iterable[str]) -> List[str]:
    allowlist: Set[str] = set()
    normalized = _normalize_keywords(keywords)
    normalized_set = set(normalized)

    if "syllabus" in normalized_set or "syllabi" in normalized_set:
        allowlist.add("syllabus")
    if "curriculum" in normalized_set or "guide" in normalized_set:
        allowlist.add("curriculum")
    if "mark" in normalized_set and "scheme" in normalized_set:
        allowlist.add("mark_scheme")
    if "past" in normalized_set and "paper" in normalized_set:
        allowlist.add("past_paper")
    if "paper" in normalized_set and "past" not in normalized_set:
        allowlist.add("past_paper")
    if "notice" in normalized_set or "registration" in normalized_set or "information" in normalized_set:
        allowlist.add("document")
        allowlist.add("notice")
        allowlist.add("registration_notice")

    return list(allowlist)


def _matches_subject(
    url: str,
    title: str,
    subject_terms: Iterable[str],
    program_terms: Iterable[str],
) -> bool:
    terms = list(subject_terms)
    if not terms:
        return True
    haystack = f"{_keyword_value(url)} {title}".lower()
    if any(term in haystack for term in terms):
        return True
    if "sea" in program_terms:
        if "sea" in haystack or "secondary entrance assessment" in haystack:
            return True
    return False


async def _preflight_validate(
    url: str,
    requestor: DomainRequestor,
    cache: Dict[str, Dict[str, Any]],
    file_types: Iterable[str],
) -> Optional[Dict[str, Any]]:
    cached = cache.get(url)
    if cached and _cache_fresh(cached):
        if cached.get("status", 0) >= 400:
            return None
        if not _matches_file_types(url, cached.get("content_type", ""), file_types):
            return None
        return cached.get("meta")

    try:
        response = await requestor.head(url, follow_redirects=True)
        if response.status_code in (401, 403, 405):
            response = await requestor.get(url, headers={"Range": "bytes=0-1024"}, follow_redirects=True)
        status = response.status_code
        content_type = response.headers.get("content-type", "")
        content_length = response.headers.get("content-length")
        last_modified = response.headers.get("last-modified")
        cache[url] = {
            "status": status,
            "content_type": content_type,
            "timestamp": time.time(),
            "meta": {
                "content_type": content_type,
                "content_length": int(content_length) if content_length and content_length.isdigit() else None,
                "last_modified": last_modified,
                "final_url": str(response.url),
            },
        }
        if status not in (200, 206):
            return None
        if not _matches_file_types(url, content_type, file_types):
            return None
        return cache[url]["meta"]
    except httpx.HTTPError:
        return None


async def discover_documents(config: Dict[str, Any]) -> DiscoveryResult:
    targets = config.get("targets") or []
    strategy = (config.get("strategy") or "").lower()
    filters = config.get("filters") or {}
    file_types = filters.get("file_types") or []
    keywords = filters.get("keywords") or []
    explicit_allow = _normalize_doc_types(
        filters.get("document_types")
        or filters.get("document_type_allowlist")
        or filters.get("doc_types")
        or []
    )
    explicit_block = _normalize_doc_types(
        filters.get("exclude_document_types")
        or filters.get("document_type_blocklist")
        or filters.get("exclude_doc_types")
        or []
    )
    wp_media_overrides = filters.get("wp_media_mime_types") or []
    respect_robots = config.get("respect_robots_txt", True)
    subject_terms = _subject_terms_from_keywords(keywords)
    subject_terms.extend(_subject_terms_from_config(config))
    program_terms = _program_terms_from_config(config)
    program_terms.extend(_program_terms_from_keywords(keywords))
    program_terms = list(dict.fromkeys(program_terms))
    doc_type_allowlist = _doc_type_allowlist_from_keywords(keywords)
    if explicit_allow:
        doc_type_allowlist = explicit_allow
    domain_profiles = DEFAULT_DOMAIN_PROFILES.copy()
    overrides = config.get("domain_profiles") or {}
    for host, profile in overrides.items():
        domain_profiles[host] = {**domain_profiles.get(host, {}), **profile}

    limits = config.get("limits") or {}
    max_sitemaps = int(limits.get("max_sitemaps", 6))
    max_sitemap_urls = int(limits.get("max_sitemap_urls", 500))
    max_documents = int(limits.get("max_documents", 50))
    per_domain_limit = int(
        limits.get(
            "max_documents_per_domain",
            os.getenv("DISCOVERY_MAX_DOCS_PER_DOMAIN", max_documents),
        )
    )
    max_seed_pages = int(limits.get("max_seed_pages", 5))
    max_page_scans = int(limits.get("max_page_scans", 25))
    max_wp_media_pages = int(limits.get("max_wp_media_pages", 2))
    max_wp_media_items = int(limits.get("max_wp_media_items", 200))
    wp_media_mime_types = _wp_media_mime_types(file_types, wp_media_overrides)
    prefer_sitemaps = bool(config.get("prefer_sitemaps", True))
    sitemap_only = bool(config.get("sitemap_only", False) or strategy == "sitemap")
    polite_mode_env = os.getenv("DISCOVERY_POLITE_MODE", "true").lower()
    polite_mode = config.get("polite_mode")
    if polite_mode is None:
        polite_mode = polite_mode_env not in {"0", "false", "no"}
    if polite_mode:
        max_page_scans = min(max_page_scans, int(os.getenv("DISCOVERY_POLITE_MAX_PAGE_SCANS", 10)))
        max_seed_pages = min(max_seed_pages, int(os.getenv("DISCOVERY_POLITE_MAX_SEED_PAGES", 3)))

    if not targets:
        return DiscoveryResult(documents=[], checked_urls=0, skipped_urls=0, used_sitemaps=[])

    cache = _load_url_cache()
    used_sitemaps: List[str] = []
    candidate_urls: Set[str] = set()
    sitemap_lastmod: Dict[str, str] = {}
    wp_media_meta: Dict[str, Dict[str, Optional[str]]] = {}
    checked_urls = 0
    skipped_urls = 0

    async with httpx.AsyncClient(headers={"User-Agent": _discovery_user_agent()}, timeout=20) as client:
        delays: Dict[str, float] = {}
        for host, profile in domain_profiles.items():
            delay = profile.get("crawl_delay")
            if delay is not None:
                delays[host] = float(delay)
        requestor = DomainRequestor(client, delays)
        robots_by_host: Dict[str, RobotsPolicy] = {}
        for base_url in targets:
            host = urlparse(base_url).netloc
            if not host or host in robots_by_host:
                continue
            profile = domain_profiles.get(host, {})
            profile_respect = profile.get("respect_robots")
            if profile_respect is False:
                robots_by_host[host] = RobotsPolicy(disallow=[], crawl_delay=None, sitemaps=[])
            else:
                robots_by_host[host] = await _fetch_robots(base_url, requestor)
                if robots_by_host[host].crawl_delay and "crawl_delay" not in profile:
                    delays[host] = max(delays.get(host, 0.0), float(robots_by_host[host].crawl_delay))

            sitemaps = robots_by_host[host].sitemaps
            if not sitemaps:
                sitemaps = [
                    urljoin(base_url.rstrip("/") + "/", "sitemap_index.xml"),
                    urljoin(base_url.rstrip("/") + "/", "sitemap.xml"),
                ]

            for sitemap_url in sitemaps[:max_sitemaps]:
                entries, is_index = await _fetch_sitemap_urls(sitemap_url, requestor, max_sitemap_urls)
                if not entries:
                    continue
                if is_index:
                    for nested in entries[:max_sitemaps]:
                        nested_loc = nested.get("loc")
                        if not nested_loc:
                            continue
                        nested_entries, _ = await _fetch_sitemap_urls(nested_loc, requestor, max_sitemap_urls)
                        for entry in nested_entries:
                            loc = entry.get("loc")
                            if not loc:
                                continue
                            if not _path_allowed(loc, domain_profiles.get(urlparse(loc).netloc, {})):
                                continue
                            candidate_urls.add(loc)
                            if entry.get("lastmod"):
                                sitemap_lastmod[loc] = entry["lastmod"]
                        used_sitemaps.append(nested_loc)
                else:
                    for entry in entries:
                        loc = entry.get("loc")
                        if not loc:
                            continue
                        if not _path_allowed(loc, domain_profiles.get(urlparse(loc).netloc, {})):
                            continue
                        candidate_urls.add(loc)
                        if entry.get("lastmod"):
                            sitemap_lastmod[loc] = entry["lastmod"]
                    used_sitemaps.append(sitemap_url)

        # WordPress media API can surface PDFs that sitemaps skip.
        checked_wp_hosts: Set[str] = set()
        for base_url in targets:
            host = urlparse(base_url).netloc
            if not host or host in checked_wp_hosts:
                continue
            checked_wp_hosts.add(host)
            profile = domain_profiles.get(host, {})
            profile_respect = profile.get("respect_robots")
            should_respect = respect_robots if profile_respect is None else bool(profile_respect)
            robots = robots_by_host.get(host)
            wp_probe_url = f"{urlparse(base_url).scheme}://{host}/wp-json/wp/v2/media"
            if should_respect and robots and not robots.allows(wp_probe_url):
                continue
            wp_items = await _fetch_wp_media(
                base_url,
                requestor,
                max_wp_media_pages,
                max_wp_media_items,
                wp_media_mime_types,
            )
            for item in wp_items:
                media_url = item.get("url")
                if not media_url:
                    continue
                if not _path_allowed(media_url, domain_profiles.get(urlparse(media_url).netloc, {})):
                    continue
                candidate_urls.add(media_url)
                wp_media_meta[media_url] = {
                    "source_date": item.get("source_date"),
                    "source_page": item.get("source_page"),
                }

        page_candidates: Set[str] = set()
        file_candidates: Set[str] = set()
        link_sources: Dict[str, str] = {}
        for url in candidate_urls:
            if not _path_allowed(url, domain_profiles.get(urlparse(url).netloc, {})):
                continue
            if any(str(url).lower().endswith(f".{ft}") for ft in file_types):
                file_candidates.add(url)
            elif _matches_keywords(_keyword_value(url), keywords):
                page_candidates.add(url)

        # Pull PDF links from key target pages and keyword-matched pages (low compute)
        should_scan_pages = not sitemap_only
        if prefer_sitemaps and len(file_candidates) >= max_documents:
            should_scan_pages = False

        if should_scan_pages:
            keyword_tokens = _normalize_keywords(keywords)
            scored_pages: List[Tuple[int, str]] = []
            for page_url in page_candidates:
                value = _keyword_value(page_url)
                score = sum(1 for token in keyword_tokens if token in value)
                scored_pages.append((score, page_url))
            scored_pages.sort(key=lambda item: (-item[0], len(item[1])))
            ordered_pages = [page for _, page in scored_pages]
            seed_pages = list(dict.fromkeys(list(targets) + ordered_pages))[:max_page_scans]
            for seed_url in seed_pages:
                try:
                    if not _path_allowed(seed_url, domain_profiles.get(urlparse(seed_url).netloc, {})):
                        continue
                    response = await requestor.get(seed_url)
                    if response.status_code != 200:
                        continue
                    for link in _extract_links(response.text):
                        if not link:
                            continue
                        absolute = urljoin(seed_url, link)
                        if not _path_allowed(absolute, domain_profiles.get(urlparse(absolute).netloc, {})):
                            continue
                        if any(str(absolute).lower().endswith(f".{ft}") for ft in file_types):
                            file_candidates.add(absolute)
                            link_sources.setdefault(absolute, seed_url)
                except httpx.HTTPError:
                    continue

        documents: List[Dict[str, Any]] = []
        per_domain_counts: Dict[str, int] = {}
        file_candidates_list = list(file_candidates)
        for url in file_candidates_list:
            if len(documents) >= max_documents:
                break
            host = urlparse(url).netloc
            if per_domain_limit > 0 and per_domain_counts.get(host, 0) >= per_domain_limit:
                skipped_urls += 1
                continue
            robots = robots_by_host.get(host)
            profile = domain_profiles.get(host, {})
            profile_respect = profile.get("respect_robots")
            should_respect = respect_robots if profile_respect is None else bool(profile_respect)
            if should_respect and robots and not robots.allows(url):
                skipped_urls += 1
                continue
            checked_urls += 1
            meta = await _preflight_validate(url, requestor, cache, file_types)
            if not meta:
                skipped_urls += 1
                continue
            title = _title_from_url(url)
            if not _matches_subject(url, title, subject_terms, program_terms):
                skipped_urls += 1
                continue
            if not _matches_program(url, title, program_terms):
                skipped_urls += 1
                continue
            doc_type = _document_type_from_context(url, link_sources.get(url))
            if doc_type_allowlist and doc_type not in doc_type_allowlist:
                skipped_urls += 1
                continue
            if explicit_block and doc_type in explicit_block:
                skipped_urls += 1
                continue
            wp_meta = wp_media_meta.get(url) or {}
            source_date = (
                sitemap_lastmod.get(url)
                or _extract_date(wp_meta.get("source_date") or "")
                or _extract_date(url)
                or _extract_date(title)
            )

            documents.append(
                {
                    "url": meta.get("final_url") or url,
                    "title": title,
                    "file_type": (file_types[0] if file_types else "pdf"),
                    "file_size": meta.get("content_length") or 0,
                    "document_type": doc_type,
                    "source_date": source_date,
                    "source_page": link_sources.get(url) or wp_meta.get("source_page"),
                    "content_type": meta.get("content_type"),
                    "last_modified": meta.get("last_modified"),
                }
            )
            per_domain_counts[host] = per_domain_counts.get(host, 0) + 1


    _save_url_cache(cache)
    return DiscoveryResult(
        documents=documents,
        checked_urls=checked_urls,
        skipped_urls=skipped_urls,
        used_sitemaps=used_sitemaps,
    )
