"""
Settings Router - Configuration Management Endpoints

Provides API endpoints for managing crawl settings:
- GET /api/v1/settings - Get all settings
- GET /api/v1/settings/{category} - Get category settings
- PUT /api/v1/settings - Update all settings
- PUT /api/v1/settings/{category} - Update category settings
- POST /api/v1/settings/reset - Reset to defaults
- POST /api/v1/settings/reset/{category} - Reset category to defaults
- GET /api/v1/settings/presets - Get preset configurations
- POST /api/v1/settings/presets/{preset_id}/apply - Apply a preset
- GET /api/v1/settings/export - Export settings
- POST /api/v1/settings/import - Import settings
- GET /api/v1/settings/metadata - Get settings metadata for UI
"""

from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from pathlib import Path
import json
import os
import sys

# Add parent for imports
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, backend_dir)

from models.crawl_settings import (
    CrawlSettings,
    PresetConfig,
    PresetListResponse,
    get_default_settings,
    get_settings_metadata
)
from utils.settings_manager import get_settings_manager

router = APIRouter()

# Load presets from config file
PRESETS_FILE = Path(__file__).parent.parent.parent / "config" / "presets.json"


def load_presets() -> List[PresetConfig]:
    """Load preset configurations from file."""
    if not PRESETS_FILE.exists():
        return []

    try:
        with open(PRESETS_FILE, 'r') as f:
            data = json.load(f)

        presets = []
        for preset_data in data.get("presets", []):
            # Convert settings dict to CrawlSettings
            settings_data = preset_data.pop("settings", {})
            preset_data["settings"] = CrawlSettings(**settings_data)
            presets.append(PresetConfig(**preset_data))

        return presets
    except Exception as e:
        print(f"Error loading presets: {e}")
        return []


# ============================================================
# Response Models
# ============================================================
class SettingsResponse(BaseModel):
    """Response containing current settings."""
    settings: Dict[str, Any]
    last_updated: Optional[str] = None
    active_preset: Optional[str] = None


class CategorySettingsResponse(BaseModel):
    """Response for a single category."""
    category: str
    settings: Dict[str, Any]


class UpdateResponse(BaseModel):
    """Response after update."""
    success: bool
    message: str
    settings: Dict[str, Any]


class PresetResponse(BaseModel):
    """Response for preset operations."""
    success: bool
    preset_id: str
    preset_name: str
    settings: Dict[str, Any]


# ============================================================
# GET Endpoints
# ============================================================
@router.get("/settings", response_model=SettingsResponse)
async def get_settings():
    """Get all current settings."""
    manager = get_settings_manager()
    data = manager.get_response_data()
    return SettingsResponse(**data)


@router.get("/settings/metadata")
async def get_settings_meta():
    """Get settings metadata for UI generation."""
    return get_settings_metadata()


@router.get("/settings/presets", response_model=PresetListResponse)
async def get_presets():
    """Get all available presets."""
    presets = load_presets()

    # Convert to dict format for response
    presets_dicts = []
    for p in presets:
        preset_dict = p.dict()
        preset_dict["settings"] = p.settings.dict()
        presets_dicts.append(preset_dict)

    return PresetListResponse(
        presets=presets_dicts,
        total=len(presets_dicts)
    )


@router.get("/settings/presets/{preset_id}")
async def get_preset(preset_id: str):
    """Get a specific preset by ID."""
    presets = load_presets()
    preset = next((p for p in presets if p.id == preset_id), None)

    if not preset:
        raise HTTPException(status_code=404, detail=f"Preset '{preset_id}' not found")

    return {
        "id": preset.id,
        "name": preset.name,
        "description": preset.description,
        "category": preset.category,
        "icon": preset.icon,
        "settings": preset.settings.dict()
    }


@router.get("/settings/{category}", response_model=CategorySettingsResponse)
async def get_category_settings(category: str):
    """Get settings for a specific category."""
    manager = get_settings_manager()
    settings = manager.get_settings()
    settings_dict = settings.dict()

    if category not in settings_dict:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown category: {category}. Valid categories: {list(settings_dict.keys())}"
        )

    return CategorySettingsResponse(
        category=category,
        settings=settings_dict[category]
    )


@router.get("/settings/export")
async def export_settings():
    """Export current settings for backup/sharing."""
    manager = get_settings_manager()
    return manager.export_settings()


# ============================================================
# PUT Endpoints
# ============================================================
@router.put("/settings", response_model=UpdateResponse)
async def update_settings(settings: Dict[str, Any] = Body(...)):
    """Update all settings."""
    try:
        manager = get_settings_manager()
        updated = manager.update_settings(settings)

        return UpdateResponse(
            success=True,
            message="Settings updated successfully",
            settings=updated.dict()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/settings/{category}", response_model=UpdateResponse)
async def update_category_settings(category: str, data: Dict[str, Any] = Body(...)):
    """Update settings for a specific category."""
    try:
        manager = get_settings_manager()
        updated = manager.update_category(category, data)

        return UpdateResponse(
            success=True,
            message=f"Category '{category}' updated successfully",
            settings=updated.dict()
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================
# POST Endpoints
# ============================================================
@router.post("/settings/reset", response_model=UpdateResponse)
async def reset_settings():
    """Reset all settings to defaults."""
    manager = get_settings_manager()
    defaults = manager.reset_to_defaults()

    return UpdateResponse(
        success=True,
        message="Settings reset to defaults",
        settings=defaults.dict()
    )


@router.post("/settings/reset/{category}", response_model=UpdateResponse)
async def reset_category_settings(category: str):
    """Reset a specific category to defaults."""
    try:
        manager = get_settings_manager()
        updated = manager.reset_category(category)

        return UpdateResponse(
            success=True,
            message=f"Category '{category}' reset to defaults",
            settings=updated.dict()
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/settings/presets/{preset_id}/apply", response_model=PresetResponse)
async def apply_preset(preset_id: str):
    """Apply a preset configuration."""
    presets = load_presets()
    preset = next((p for p in presets if p.id == preset_id), None)

    if not preset:
        raise HTTPException(status_code=404, detail=f"Preset '{preset_id}' not found")

    manager = get_settings_manager()

    # Build presets dict for manager
    presets_dict = {p.id: p.settings for p in presets}
    manager.apply_preset(preset_id, presets_dict)

    return PresetResponse(
        success=True,
        preset_id=preset.id,
        preset_name=preset.name,
        settings=preset.settings.dict()
    )


@router.post("/settings/import", response_model=UpdateResponse)
async def import_settings(data: Dict[str, Any] = Body(...)):
    """Import settings from exported data."""
    try:
        manager = get_settings_manager()
        imported = manager.import_settings(data)

        return UpdateResponse(
            success=True,
            message="Settings imported successfully",
            settings=imported.dict()
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================
# Utility Endpoints
# ============================================================
@router.get("/settings/value/{key:path}")
async def get_setting_value(key: str):
    """Get a specific setting value by dot-notation key.

    Examples:
    - /settings/value/limits.max_pages
    - /settings/value/quality.min_quality_score
    - /settings/value/notifications.email.enabled
    """
    try:
        manager = get_settings_manager()
        value = manager.get_value(key)
        return {"key": key, "value": value}
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/settings/value/{key:path}")
async def set_setting_value(key: str, value: Any = Body(..., embed=True)):
    """Set a specific setting value by dot-notation key."""
    try:
        manager = get_settings_manager()
        manager.set_value(key, value)
        return {"key": key, "value": value, "success": True}
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/settings/defaults")
async def get_default_settings_endpoint():
    """Get default settings without changing current settings."""
    defaults = get_default_settings()
    return {"settings": defaults.dict()}
