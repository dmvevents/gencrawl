"""Templates Router - Template Management Endpoints."""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
import os
import sys

# Add parent directory to path for imports
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, backend_dir)

from models.crawl_template import (
    CrawlTemplate,
    TemplateCategory,
    TemplateCreateRequest,
    TemplateUpdateRequest,
    TemplateListResponse,
    TemplateUseResponse,
    CrawlConfig,
)
from utils.template_manager import template_manager

router = APIRouter()


@router.get("/templates", response_model=TemplateListResponse)
async def list_templates(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search templates"),
    builtin_only: bool = Query(False, description="Show only built-in templates"),
    custom_only: bool = Query(False, description="Show only custom templates"),
):
    """List all templates with optional filtering."""
    if builtin_only:
        templates = template_manager.get_builtin_templates()
    elif custom_only:
        templates = template_manager.get_custom_templates()
    elif search:
        templates = template_manager.search_templates(search)
    elif category:
        try:
            cat = TemplateCategory(category)
            templates = template_manager.get_templates_by_category(cat)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
    else:
        templates = template_manager.get_all_templates()

    builtin_count = len([t for t in templates if t.is_builtin])
    custom_count = len([t for t in templates if not t.is_builtin])

    return TemplateListResponse(
        templates=templates,
        total=len(templates),
        builtin_count=builtin_count,
        custom_count=custom_count,
    )


@router.get("/templates/categories")
async def list_categories():
    """List all template categories with counts."""
    categories = template_manager.get_categories()
    return {
        "categories": categories,
        "total": len(categories),
    }


@router.get("/templates/popular")
async def get_popular_templates(
    limit: int = Query(5, ge=1, le=20, description="Number of templates to return")
):
    """Get most used templates."""
    templates = template_manager.get_popular_templates(limit)
    return {
        "templates": templates,
        "total": len(templates),
    }


@router.get("/templates/stats")
async def get_template_stats():
    """Get template statistics."""
    stats = template_manager.get_stats()
    return stats


@router.get("/templates/{template_id}")
async def get_template(template_id: str):
    """Get a specific template by ID."""
    template = template_manager.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template {template_id} not found")
    return template


@router.post("/templates", response_model=CrawlTemplate)
async def create_template(request: TemplateCreateRequest):
    """Create a new custom template."""
    template = template_manager.create_template(request)
    return template


@router.put("/templates/{template_id}", response_model=CrawlTemplate)
async def update_template(template_id: str, request: TemplateUpdateRequest):
    """Update an existing custom template."""
    # Check if template exists
    existing = template_manager.get_template(template_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Template {template_id} not found")

    # Cannot update built-in templates
    if existing.is_builtin:
        raise HTTPException(
            status_code=403,
            detail="Cannot modify built-in templates. Use duplicate to create a custom copy."
        )

    template = template_manager.update_template(template_id, request)
    if not template:
        raise HTTPException(status_code=500, detail="Failed to update template")

    return template


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str):
    """Delete a custom template."""
    existing = template_manager.get_template(template_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Template {template_id} not found")

    if existing.is_builtin:
        raise HTTPException(
            status_code=403,
            detail="Cannot delete built-in templates"
        )

    success = template_manager.delete_template(template_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete template")

    return {
        "template_id": template_id,
        "deleted": True,
        "message": "Template deleted successfully"
    }


@router.post("/templates/{template_id}/use", response_model=TemplateUseResponse)
async def use_template(template_id: str):
    """
    Use a template - marks it as used and returns the configuration.
    The returned config can be used to start a new crawl.
    """
    template = template_manager.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template {template_id} not found")

    config = template_manager.use_template(template_id)
    if not config:
        raise HTTPException(status_code=500, detail="Failed to use template")

    return TemplateUseResponse(
        template_id=template_id,
        template_name=template.name,
        config=config,
        message=f"Template '{template.name}' ready to use"
    )


@router.post("/templates/{template_id}/duplicate")
async def duplicate_template(
    template_id: str,
    new_name: str = Query(..., min_length=1, max_length=100, description="Name for the new template")
):
    """
    Duplicate a template (built-in or custom) to create a new custom template.
    Useful for customizing built-in templates.
    """
    existing = template_manager.get_template(template_id)
    if not existing:
        raise HTTPException(status_code=404, detail=f"Template {template_id} not found")

    new_template = template_manager.duplicate_template(template_id, new_name)
    if not new_template:
        raise HTTPException(status_code=500, detail="Failed to duplicate template")

    return {
        "original_template_id": template_id,
        "new_template": new_template,
        "message": f"Template duplicated as '{new_name}'"
    }


@router.get("/templates/{template_id}/preview")
async def preview_template(template_id: str):
    """
    Preview a template's configuration without using it.
    Returns the full config for display/preview purposes.
    """
    template = template_manager.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template {template_id} not found")

    return {
        "template_id": template_id,
        "name": template.name,
        "description": template.description,
        "category": template.category.value,
        "icon": template.icon,
        "tags": template.tags,
        "is_builtin": template.is_builtin,
        "config": template.config.dict(),
        "used_count": template.used_count,
        "created_at": template.created_at.isoformat() if template.created_at else None,
        "last_used_at": template.last_used_at.isoformat() if template.last_used_at else None,
    }
