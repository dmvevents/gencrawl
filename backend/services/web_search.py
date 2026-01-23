from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

import httpx


class WebSearchClient:
    def __init__(self) -> None:
        self.base_url = os.getenv("WEB_SEARCH_URL", "http://localhost:8080").rstrip("/")
        self.provider = os.getenv("WEB_SEARCH_PROVIDER", "searxng")

    def search(
        self,
        query: str,
        limit: int = 10,
        categories: Optional[str] = None,
        engines: Optional[str] = None,
    ) -> Dict[str, Any]:
        if self.provider != "searxng":
            raise ValueError(f"Unsupported web search provider: {self.provider}")
        params = {"q": query, "format": "json", "language": "en"}
        if categories:
            params["categories"] = categories
        if engines:
            params["engines"] = engines
        with httpx.Client(timeout=30) as client:
            resp = client.get(f"{self.base_url}/search", params=params)
            resp.raise_for_status()
            data = resp.json()
        results: List[Dict[str, Any]] = []
        for item in data.get("results", [])[:limit]:
            results.append(
                {
                    "title": item.get("title"),
                    "url": item.get("url"),
                    "content": item.get("content"),
                    "score": item.get("score"),
                    "engine": item.get("engine"),
                }
            )
        return {"query": query, "results": results, "provider": self.provider}
