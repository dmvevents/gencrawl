from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health_check():
    """System health check."""
    services = {
        "api": "up",
        "database": "up",  # TODO: actual DB check
        "redis": "up",     # TODO: actual Redis check
        "weaviate": "up"   # TODO: actual Weaviate check
    }

    return {
        "status": "healthy" if all(v == "up" for v in services.values()) else "degraded",
        "services": services
    }
