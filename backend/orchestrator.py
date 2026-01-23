from anthropic import Anthropic
from typing import Dict, Any, Optional, List
import json
import os
import logging
import re
import httpx

try:
    from services.web_search import WebSearchClient
except Exception:  # pragma: no cover - optional dependency
    WebSearchClient = None

logger = logging.getLogger(__name__)

class LLMOrchestrator:
    """
    LLM-powered query interpretation and crawler configuration.
    Uses Claude Sonnet 4.5 to interpret natural language queries.
    """

    def __init__(self):
        self.provider = (os.getenv("LLM_PROVIDER") or "auto").lower()
        self.strict = os.getenv("LLM_STRICT", "false").lower() == "true"
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        self.openai_key = os.getenv("OPENAI_API_KEY")
        self.gemini_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        self.client = None
        if self.provider in ("anthropic", "auto") and self.api_key:
            self.client = Anthropic(api_key=self.api_key)
        self.model = os.getenv("ANTHROPIC_MODEL") or "claude-sonnet-4-5-20250929"
        self.openai_model = os.getenv("OPENAI_MODEL") or "gpt-4o-mini"
        self.gemini_model = os.getenv("GEMINI_MODEL") or "gemini-1.5-flash"

    QUERY_ANALYZER_PROMPT = """You are a web crawling configuration expert. Analyze the user's query and generate a detailed crawl configuration.

# User Query
{user_query}

# Your Task
Generate a JSON configuration with:

1. **targets** - List of URLs/domains to crawl
2. **strategy** - Crawl strategy: "sitemap", "recursive", "search-based", "api", "focused"
3. **crawler** - Crawler type: "scrapy" (fast HTTP), "crawl4ai" (LLM-ready), "playwright" (JS), "custom" (API)
4. **filters** - Date ranges, file types, keywords, exclude patterns
5. **extraction** - Data extraction rules
6. **quality** - Validation criteria
7. **taxonomy** - Classification schema for organizing documents
8. **output** - Folder structure and naming

# Output JSON Format
{{
  "targets": ["example.com"],
  "strategy": "recursive",
  "crawler": "scrapy",
  "filters": {{
    "date_range": ["2020-01-01", "2025-12-31"],
    "file_types": ["pdf"],
    "keywords": ["mathematics"],
    "exclude_patterns": ["/blog/"]
  }},
  "extraction": {{
    "title": "CSS selector",
    "date": "regex pattern"
  }},
  "quality": {{
    "min_relevance_score": 0.7,
    "required_fields": ["title", "date"]
  }},
  "taxonomy": {{
    "dimensions": ["authority", "program", "level", "subject", "year", "document_type", "region", "language"],
    "defaults": {{
      "language": "en"
    }},
    "hints": {{
      "program": "CSEC",
      "region": "Caribbean"
    }}
  }},
  "output": {{
    "structure": "region/program/level/subject/year/document_type/",
    "naming": "{{exam}}_{{subject}}_{{year}}.pdf",
    "format": "jsonl"
  }}
}}

Generate only valid JSON, no extra text."""

    async def interpret_query(self, user_query: str, overrides: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Interpret natural language query and generate crawler config."""
        provider = self._resolve_provider()
        if provider == "heuristic":
            config = self._heuristic_config(user_query, "No LLM provider configured")
            return self._finalize_config(config, user_query, overrides)
        if provider == "anthropic" and not self.client:
            config = self._heuristic_config(user_query, "LLM disabled or missing API key")
            return self._finalize_config(config, user_query, overrides)
        if provider == "openai" and not self.openai_key:
            config = self._heuristic_config(user_query, "OpenAI API key missing")
            return self._finalize_config(config, user_query, overrides)
        if provider == "google" and not self.gemini_key:
            config = self._heuristic_config(user_query, "Gemini API key missing")
            return self._finalize_config(config, user_query, overrides)

        prompt = self.QUERY_ANALYZER_PROMPT.format(user_query=user_query)
        try:
            config_text, model_used = await self._generate_config(prompt, provider)

            # Extract JSON from markdown code block if present
            if "```json" in config_text:
                config_text = config_text.split("```json")[1].split("```")[0].strip()
            elif "```" in config_text:
                config_text = config_text.split("```")[1].split("```")[0].strip()

            config = json.loads(config_text)
            config.setdefault("model_used", model_used)
        except Exception as exc:
            if self.strict:
                raise
            logger.warning("LLM config generation failed, using heuristic fallback: %s", exc)
            config = self._heuristic_config(user_query, f"LLM error: {exc}")

        config = self._finalize_config(config, user_query, overrides)
        config = self._apply_web_search(config, user_query)
        return config

    def _finalize_config(
        self,
        config: Dict[str, Any],
        user_query: str,
        overrides: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Apply defaults and explicit overrides to a config."""
        # Add metadata
        config["original_query"] = user_query
        config.setdefault("model_used", self.model if self.client else "heuristic")

        # Add metadata
        config.setdefault(
            "taxonomy",
            {
                "dimensions": [
                    "authority",
                    "program",
                    "level",
                    "subject",
                    "year",
                    "document_type",
                    "region",
                    "language",
                ],
                "defaults": {"language": "en"},
                "hints": {},
            },
        )
        config.setdefault("output", {})
        config["output"].setdefault("structure", "region/program/level/subject/year/document_type/")
        config["output"].setdefault("format", "jsonl")
        config.setdefault("respect_robots_txt", True)

        # Apply explicit overrides from UI or API request
        if overrides:
            strategy = overrides.get("strategy")
            crawler = overrides.get("crawler")
            depth = overrides.get("depth")
            file_types = overrides.get("file_types")
            output_format = overrides.get("output_format")
            respect_robots_txt = overrides.get("respect_robots_txt")
            targets = overrides.get("targets")
            limits = overrides.get("limits")
            filters_override = overrides.get("filters")

            if strategy and strategy != "auto":
                config["strategy"] = strategy
            if crawler and crawler != "auto":
                config["crawler"] = crawler
            if depth and depth != "auto":
                config["depth"] = depth
            if file_types:
                config.setdefault("filters", {})
                config["filters"]["file_types"] = file_types
            if output_format:
                config.setdefault("output", {})
                config["output"]["format"] = output_format
            if respect_robots_txt is not None:
                config["respect_robots_txt"] = respect_robots_txt
            if targets:
                config["targets"] = targets
            if limits:
                config["limits"] = limits
            if filters_override:
                config["filters"] = filters_override

        return config

    def _apply_web_search(self, config: Dict[str, Any], user_query: str) -> Dict[str, Any]:
        """Augment targets using web search when strategy is search-based or targets are missing."""
        enabled = os.getenv("WEB_SEARCH_ENABLE", "false").lower() == "true"
        if not enabled or WebSearchClient is None:
            return config

        strategy = (config.get("strategy") or "").lower()
        targets = config.get("targets") or []
        if targets and strategy != "search-based":
            return config

        max_results = int(os.getenv("WEB_SEARCH_MAX_RESULTS", "10"))
        domain_limit = int(os.getenv("WEB_SEARCH_DOMAIN_LIMIT", "5"))
        allowlist_raw = os.getenv("WEB_SEARCH_DOMAIN_ALLOWLIST", "").strip()
        allowlist = [d.strip().lower() for d in allowlist_raw.split(",") if d.strip()] if allowlist_raw else []

        try:
            client = WebSearchClient()
            search_result = client.search(query=user_query, limit=max_results)
        except Exception as exc:
            config.setdefault("web_search", {})["error"] = str(exc)
            return config

        urls = [r.get("url") for r in search_result.get("results", []) if r.get("url")]
        if allowlist:
            filtered = []
            for url in urls:
                match = re.match(r"https?://([^/]+)", url or "")
                if not match:
                    continue
                domain = match.group(1).lower()
                if any(domain.endswith(a) for a in allowlist):
                    filtered.append(url)
            urls = filtered
        domains: List[str] = []
        for url in urls:
            match = re.match(r"https?://([^/]+)", url)
            if not match:
                continue
            domain = match.group(1)
            if domain not in domains:
                domains.append(domain)
            if len(domains) >= domain_limit:
                break

        if domains:
            config["targets"] = [f"https://{d}" for d in domains]
            if strategy == "search-based":
                config["strategy"] = "recursive"

        config["web_search"] = {
            "provider": search_result.get("provider"),
            "results": search_result.get("results", []),
        }
        return config

    def _resolve_provider(self) -> str:
        provider = self.provider
        if provider != "auto":
            return provider
        if self.api_key:
            return "anthropic"
        if self.openai_key:
            return "openai"
        if self.gemini_key:
            return "google"
        return "heuristic"

    async def _generate_config(self, prompt: str, provider: str) -> tuple[str, str]:
        if provider == "anthropic":
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text, self.model

        if provider == "openai":
            if not self.openai_key:
                raise ValueError("OpenAI API key missing")
            headers = {
                "Authorization": f"Bearer {self.openai_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": self.openai_model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "max_tokens": 2000,
            }
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers=headers,
                    json=payload,
                )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"], self.openai_model

        if provider == "google":
            if not self.gemini_key:
                raise ValueError("Gemini API key missing")
            url = (
                "https://generativelanguage.googleapis.com/v1beta/models/"
                f"{self.gemini_model}:generateContent?key={self.gemini_key}"
            )
            payload = {
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.2, "maxOutputTokens": 2000},
            }
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            return data["candidates"][0]["content"]["parts"][0]["text"], self.gemini_model

        raise ValueError(f"Unsupported LLM provider: {provider}")

    def _heuristic_config(self, user_query: str, reason: str) -> Dict[str, Any]:
        """Build a best-effort crawl config without calling an LLM."""
        query_lower = user_query.lower()
        targets = self._extract_targets(user_query)

        file_types = self._extract_file_types(query_lower)
        keywords = self._extract_keywords(user_query)
        taxonomy_hints = self._infer_taxonomy_hints(query_lower)

        config: Dict[str, Any] = {
            "targets": targets,
            "strategy": "recursive" if targets else "search-based",
            "crawler": "crawl4ai" if any(k in query_lower for k in ["pdf", "document", "report", "paper"]) else "scrapy",
            "filters": {},
            "model_used": "heuristic",
            "respect_robots_txt": True,
            "taxonomy": {
                "dimensions": [
                    "authority",
                    "program",
                    "level",
                    "subject",
                    "year",
                    "document_type",
                    "region",
                    "language",
                ],
                "defaults": {"language": "en"},
                "hints": taxonomy_hints,
            },
            "output": {
                "structure": "region/program/level/subject/year/document_type/",
                "format": "jsonl",
            },
            "llm_fallback_reason": reason,
        }

        if file_types:
            config["filters"]["file_types"] = file_types
        if keywords:
            config["filters"]["keywords"] = keywords
        if not config["filters"]:
            config.pop("filters", None)

        return config

    def _extract_targets(self, user_query: str) -> List[str]:
        url_pattern = re.compile(r"https?://[^\s,]+", re.IGNORECASE)
        urls = url_pattern.findall(user_query)

        domain_pattern = re.compile(r"\b[a-z0-9.-]+\.[a-z]{2,}\b", re.IGNORECASE)
        domains = [d for d in domain_pattern.findall(user_query) if d not in urls]
        for domain in domains:
            urls.append(f"https://{domain}")

        return list(dict.fromkeys(urls))

    def _extract_file_types(self, query_lower: str) -> List[str]:
        file_types = []
        for ext in ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "csv", "json", "zip"]:
            if ext in query_lower:
                file_types.append(ext)
        return file_types

    def _extract_keywords(self, user_query: str) -> List[str]:
        stopwords = {
            "the", "and", "for", "with", "from", "that", "this", "into", "your",
            "have", "find", "search", "crawl", "documents", "document", "files",
            "pdfs", "about", "past", "papers", "paper", "tests", "test", "examples",
            "official", "curriculum", "practice", "standards", "forms", "levels",
        }
        tokens = re.findall(r"[a-z0-9]+", user_query.lower())
        keywords = [t for t in tokens if len(t) > 2 and t not in stopwords]
        return list(dict.fromkeys(keywords))[:12]

    def _infer_taxonomy_hints(self, query_lower: str) -> Dict[str, Any]:
        hints: Dict[str, Any] = {}
        if "caribbean" in query_lower:
            hints["region"] = "Caribbean"
        if "cxc" in query_lower or "caribbean examinations council" in query_lower:
            hints["authority"] = "CXC"
        if "csec" in query_lower or "csx" in query_lower:
            hints["program"] = "CSEC"
        if "cape" in query_lower:
            hints["program"] = "CAPE"
        if "mathematics" in query_lower or "math" in query_lower:
            hints["subject"] = "Mathematics"
        if "english" in query_lower:
            hints["subject"] = "English"
        if "science" in query_lower:
            hints["subject"] = "Science"

        year_match = re.search(r"\b(19|20)\d{2}\b", query_lower)
        if year_match:
            hints["year"] = year_match.group(0)

        for doc_type, keyword in {
            "past_paper": "past paper",
            "syllabus": "syllabus",
            "curriculum": "curriculum",
            "specification": "specification",
            "standard": "standard",
        }.items():
            if keyword in query_lower:
                hints["document_type"] = doc_type
                break

        return hints
