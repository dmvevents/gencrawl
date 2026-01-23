from fastapi import APIRouter, Query, HTTPException
from typing import Optional

from services.web_search import WebSearchClient

router = APIRouter()

@router.get("/web-search")
async def web_search(
    query: str = Query(..., description="Search query"),
    limit: int = Query(10, ge=1, le=50),
    categories: Optional[str] = Query(None, description="SearXNG categories"),
    engines: Optional[str] = Query(None, description="Comma-separated engines"),
):
    try:
        client = WebSearchClient()
        return client.search(query=query, limit=limit, categories=categories, engines=engines)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
