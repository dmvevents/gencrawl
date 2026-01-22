from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import sys
import os
import copy

# Add parent directory to path for imports
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, backend_dir)

from services.singletons import orchestrator, crawler_manager

router = APIRouter()

class CrawlRequest(BaseModel):
    query: str
    user_id: str = "default"
    output_format: str = "pretraining"
    strategy: Optional[str] = None
    crawler: Optional[str] = None
    depth: Optional[str] = None
    file_types: Optional[List[str]] = None
    targets: Optional[List[str]] = None
    limits: Optional[Dict[str, int]] = None
    filters: Optional[Dict[str, Any]] = None
    respect_robots_txt: Optional[bool] = None


class CrawlRecommendationRequest(BaseModel):
    query: str
    targets: Optional[List[str]] = None
    file_types: Optional[List[str]] = None
    filters: Optional[Dict[str, Any]] = None
    respect_robots_txt: Optional[bool] = None


class CrawlRecommendationResponse(BaseModel):
    config: Dict[str, Any]
    preview: Dict[str, Any]
    recommended_limits: Dict[str, int]
    questions: List[str]


def _build_overrides(request: CrawlRequest) -> Dict[str, Any]:
    return {
        "strategy": request.strategy,
        "crawler": request.crawler,
        "depth": request.depth,
        "file_types": request.file_types,
        "output_format": request.output_format,
        "targets": request.targets,
        "limits": request.limits,
        "filters": request.filters,
        "respect_robots_txt": request.respect_robots_txt,
    }


def _build_recommendation_overrides(request: CrawlRecommendationRequest) -> Dict[str, Any]:
    return {
        "file_types": request.file_types,
        "targets": request.targets,
        "filters": request.filters,
        "respect_robots_txt": request.respect_robots_txt,
    }


def _recommend_limits(preview: Dict[str, Any]) -> Dict[str, int]:
    checked = max(preview.get("checked_urls", 0), 1)
    docs = preview.get("documents_found", 0)
    density = docs / checked
    if docs < 10 or density < 0.02:
        return {
            "max_documents": 1000,
            "max_sitemaps": 200,
            "max_sitemap_urls": 3000,
            "max_page_scans": 400,
            "max_wp_media_pages": 15,
            "max_wp_media_items": 2000,
        }
    if density < 0.05:
        return {
            "max_documents": 1000,
            "max_sitemaps": 120,
            "max_sitemap_urls": 2500,
            "max_page_scans": 300,
            "max_wp_media_pages": 10,
            "max_wp_media_items": 1500,
        }
    return {
        "max_documents": 1000,
        "max_sitemaps": 80,
        "max_sitemap_urls": 2000,
        "max_page_scans": 200,
        "max_wp_media_pages": 6,
        "max_wp_media_items": 800,
    }


def _recommend_questions(config: Dict[str, Any], preview: Dict[str, Any]) -> List[str]:
    targets = config.get("targets") or []
    file_types = (config.get("filters") or {}).get("file_types") or []
    questions = []
    if not targets:
        questions.append("Which official domains should we prioritize (e.g., moe.gov.tt, cxc.org)?")
    if not file_types:
        questions.append("Do you want PDFs only, or include DOC/DOCX as well?")
    questions.append("Should we widen the date range or include historical archives?")
    questions.append("Are registration forms and notices as important as syllabi and past papers?")
    if preview.get("documents_found", 0) < 10:
        questions.append("Should we expand to related exam boards or neighboring Caribbean ministries?")
    return questions[:5]

@router.post("/crawl")
async def submit_crawl(request: CrawlRequest, background_tasks: BackgroundTasks):
    """Submit a natural language crawl request."""
    try:
        # Interpret query with LLM
        config = await orchestrator.interpret_query(
            request.query,
            overrides=_build_overrides(request)
        )

        # Create crawl job
        crawl_id = crawler_manager.create_crawl(config, request.user_id)

        # Start crawl in background
        background_tasks.add_task(crawler_manager.execute_crawl, crawl_id)

        return {
            "crawl_id": crawl_id,
            "status": "queued",
            "config": config,
            "message": "Crawl job submitted successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/crawl/recommendations", response_model=CrawlRecommendationResponse)
async def recommend_crawl_settings(request: CrawlRecommendationRequest):
    """Run a shallow discovery to suggest optimized crawl limits and follow-up questions."""
    try:
        config = await orchestrator.interpret_query(
            request.query,
            overrides=_build_recommendation_overrides(request),
        )
        preview_config = copy.deepcopy(config)
        preview_config["limits"] = {
            "max_documents": 200,
            "max_sitemaps": 6,
            "max_sitemap_urls": 300,
            "max_page_scans": 15,
            "max_wp_media_pages": 1,
            "max_wp_media_items": 100,
        }
        from utils.discovery import discover_documents
        discovery = await discover_documents(preview_config)
        preview = {
            "checked_urls": discovery.checked_urls,
            "skipped_urls": discovery.skipped_urls,
            "documents_found": len(discovery.documents),
            "sitemaps": discovery.used_sitemaps[:20],
            "sample_urls": [doc.get("url") for doc in discovery.documents[:10]],
        }
        recommended_limits = _recommend_limits(preview)
        questions = _recommend_questions(config, preview)
        return CrawlRecommendationResponse(
            config=config,
            preview=preview,
            recommended_limits=recommended_limits,
            questions=questions,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/crawl/plan")
async def preview_crawl_plan(request: CrawlRequest):
    """Generate a crawl configuration without creating a job."""
    try:
        config = await orchestrator.interpret_query(
            request.query,
            overrides=_build_overrides(request)
        )
        return {
            "config": config,
            "message": "Crawl plan generated successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# IMPORTANT: Static routes MUST come before parameterized routes
# Otherwise /crawl/stats gets matched by /crawl/{crawl_id}/status
@router.get("/crawl/stats")
async def get_crawl_stats():
    """Get aggregate statistics for all crawls.

    This endpoint provides summary statistics including:
    - Total crawls count
    - Running/completed/failed counts
    - Total URLs crawled
    - Total documents found

    Uses same data source as /crawls endpoint (persistent logs).
    """
    # Import _get_all_crawls from crawls router
    from api.routers.crawls import _get_all_crawls

    # Get all crawls from persistent storage (logs)
    all_crawls = _get_all_crawls()

    # Calculate stats from persistent data
    stats = {
        "total_crawls": len(all_crawls),
        "running": sum(1 for c in all_crawls if c.get("status") in ['running', 'crawling', 'extracting', 'processing']),
        "completed": sum(1 for c in all_crawls if c.get("status") == 'completed'),
        "failed": sum(1 for c in all_crawls if c.get("status") == 'failed'),
        "total_urls_crawled": sum(c.get("urls_crawled", 0) for c in all_crawls),
        "total_documents_found": sum(c.get("documents_found", 0) for c in all_crawls),
        "average_success_rate": 0.0,
        "average_quality_score": 0.0,
        "progress": {
            "crawled": sum(c.get("urls_crawled", 0) for c in all_crawls),
            "total": sum(c.get("urls_total", 0) for c in all_crawls)
        },
        "documents_found": sum(c.get("documents_found", 0) for c in all_crawls),
        "average_quality": 0.0,
        "throughput": 0
    }

    # Calculate averages from completed jobs
    completed_crawls = [c for c in all_crawls if c.get("status") == 'completed']

    if completed_crawls:
        success_rates = [c.get("success_rate", 0) for c in completed_crawls]
        if success_rates:
            stats["average_success_rate"] = sum(success_rates) / len(success_rates)

        quality_scores = [c.get("quality_score", 0) for c in completed_crawls]
        if quality_scores:
            stats["average_quality_score"] = sum(quality_scores) / len(quality_scores)
            stats["average_quality"] = stats["average_quality_score"]

    return stats


# Parameterized routes come AFTER static routes
@router.get("/crawl/{crawl_id}/status")
async def get_crawl_status(crawl_id: str):
    """Get crawl job status."""
    status = crawler_manager.get_status(crawl_id)
    if not status:
        raise HTTPException(status_code=404, detail="Crawl not found")
    return status


@router.get("/crawl/{crawl_id}/results")
async def get_crawl_results(crawl_id: str):
    """Get crawl results."""
    results = crawler_manager.get_results(crawl_id)
    if not results:
        raise HTTPException(status_code=404, detail="Results not found")
    return results
