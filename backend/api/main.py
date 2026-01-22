from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="../.env")


# Global WebSocket manager for real-time updates
ws_manager = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler - startup and shutdown."""
    global ws_manager

    # Startup
    print("Starting GenCrawl API...")

    # Initialize WebSocket manager
    try:
        from websocket.manager import WebSocketManager
        ws_manager = WebSocketManager()
        app.state.ws_manager = ws_manager
        print("WebSocket manager initialized")
    except Exception as e:
        print(f"Warning: Could not initialize WebSocket manager: {e}")

    # Initialize scheduler
    try:
        from utils.scheduler import crawl_scheduler
        crawl_scheduler.start()
        print("Scheduler started successfully")
    except Exception as e:
        print(f"Warning: Could not start scheduler: {e}")

    # Load persisted jobs
    try:
        from services.singletons import crawler_manager
        await crawler_manager.load_jobs_from_storage()
        print("Persisted jobs loaded successfully")
    except Exception as e:
        print(f"Warning: Could not load persisted jobs: {e}")

    yield

    # Shutdown
    print("Shutting down GenCrawl API...")
    try:
        from utils.scheduler import crawl_scheduler
        crawl_scheduler.stop()
        print("Scheduler stopped")
    except Exception as e:
        print(f"Warning: Error stopping scheduler: {e}")


app = FastAPI(
    title="GenCrawl API",
    description="LLM-ready web crawling with natural language interface",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers
from api.routers import health, crawl, search, monitoring, crawls, iterations, settings, templates, schedules, documents, errors, logs, sessions, ingest, archive

app.include_router(health.router, prefix="/api/v1", tags=["health"])
app.include_router(crawl.router, prefix="/api/v1", tags=["crawl"])
app.include_router(crawls.router, prefix="/api/v1", tags=["crawls"])
app.include_router(search.router, prefix="/api/v1", tags=["search"])
app.include_router(monitoring.router, prefix="/api/v1", tags=["monitoring"])
app.include_router(iterations.router, prefix="/api/v1", tags=["iterations"])
app.include_router(settings.router, prefix="/api/v1", tags=["settings"])
app.include_router(templates.router, prefix="/api/v1", tags=["templates"])
app.include_router(schedules.router, prefix="/api/v1", tags=["schedules"])
app.include_router(documents.router, prefix="/api/v1", tags=["documents"])
app.include_router(errors.router, prefix="/api/v1", tags=["errors"])
app.include_router(logs.router, prefix="/api/v1", tags=["logs"])
app.include_router(sessions.router, prefix="/api/v1", tags=["sessions"])
app.include_router(ingest.router, prefix="/api/v1", tags=["ingest"])
app.include_router(archive.router, prefix="/api/v1", tags=["archive"])


# WebSocket endpoint for real-time updates
@app.websocket("/api/v1/ws/global")
async def websocket_global(websocket: WebSocket):
    """Global WebSocket for all events."""
    if not ws_manager:
        await websocket.close(code=1011, reason="WebSocket manager not initialized")
        return

    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and receive any client messages
            data = await websocket.receive_text()
            # Handle ping/pong or other client messages
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        await ws_manager.disconnect(websocket)


@app.websocket("/api/v1/ws/crawl/{crawl_id}")
async def websocket_crawl(websocket: WebSocket, crawl_id: str):
    """WebSocket for specific crawl updates."""
    if not ws_manager:
        await websocket.close(code=1011, reason="WebSocket manager not initialized")
        return

    await ws_manager.connect(websocket, crawl_id)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket, crawl_id)
    except Exception as e:
        print(f"WebSocket error for crawl {crawl_id}: {e}")
        await ws_manager.disconnect(websocket, crawl_id)


@app.get("/")
async def root():
    return {
        "name": "GenCrawl API",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
        "websocket": "/api/v1/ws/global"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=os.getenv("API_HOST", "0.0.0.0"),
        port=int(os.getenv("API_PORT", 8000))
    )
