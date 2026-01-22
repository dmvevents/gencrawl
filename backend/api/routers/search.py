from fastapi import APIRouter, Query

router = APIRouter()

@router.get("/search")
async def semantic_search(
    query: str = Query(..., description="Search query"),
    limit: int = Query(10, ge=1, le=100)
):
    """Semantic search across crawled documents."""
    # TODO: Implement Weaviate search
    return {
        "query": query,
        "results": [],
        "message": "Search functionality coming soon"
    }
