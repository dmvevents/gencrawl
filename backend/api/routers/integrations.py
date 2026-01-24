from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime
import json
from pathlib import Path

from utils.paths import get_repo_root


router = APIRouter()


class IntegrationConfig(BaseModel):
    id: str
    name: str
    type: str
    description: str
    status: str = "disconnected"
    config: Dict[str, Any] = Field(default_factory=dict)
    updated_at: Optional[str] = None


class IntegrationListResponse(BaseModel):
    integrations: List[IntegrationConfig]
    updated_at: Optional[str] = None


class IntegrationConnectRequest(BaseModel):
    config: Dict[str, Any] = Field(default_factory=dict)
    store_sensitive: bool = False


class IntegrationStatusResponse(BaseModel):
    id: str
    status: str
    updated_at: Optional[str] = None
    message: Optional[str] = None


def _storage_path() -> Path:
    return get_repo_root() / "data" / "integrations" / "state.json"


def _default_integrations() -> Dict[str, IntegrationConfig]:
    return {
        "outlook": IntegrationConfig(
            id="outlook",
            name="Outlook 365",
            type="email",
            description="Pull attachments and shared inboxes.",
        ),
        "gmail": IntegrationConfig(
            id="gmail",
            name="Gmail",
            type="email",
            description="Import labeled mail threads and PDFs.",
        ),
        "google_drive": IntegrationConfig(
            id="google_drive",
            name="Google Drive",
            type="drive",
            description="Sync shared drives and folders.",
        ),
        "google_cloud_storage": IntegrationConfig(
            id="google_cloud_storage",
            name="Google Cloud Storage",
            type="object_storage",
            description="Ingest buckets with lifecycle rules.",
        ),
        "sharepoint": IntegrationConfig(
            id="sharepoint",
            name="SharePoint",
            type="drive",
            description="Secure doc libraries & lists.",
        ),
        "dropbox": IntegrationConfig(
            id="dropbox",
            name="Dropbox",
            type="drive",
            description="Sync folders and shared links.",
        ),
        "azure_blob": IntegrationConfig(
            id="azure_blob",
            name="Azure Blob Storage",
            type="object_storage",
            description="Container ingest with metadata tags.",
        ),
        "s3": IntegrationConfig(
            id="s3",
            name="S3 / Object Storage",
            type="object_storage",
            description="Bucket ingest with manifest.",
        ),
        "web_uploads": IntegrationConfig(
            id="web_uploads",
            name="Web Uploads",
            type="upload",
            description="Drag & drop, bulk zip imports.",
        ),
        "api_intake": IntegrationConfig(
            id="api_intake",
            name="API Intake",
            type="api",
            description="POST documents + metadata.",
        ),
        "local_drive": IntegrationConfig(
            id="local_drive",
            name="Local Drive",
            type="local",
            description="Watch folders for local imports.",
        ),
    }


def _load_state() -> Dict[str, IntegrationConfig]:
    path = _storage_path()
    defaults = _default_integrations()
    if not path.exists():
        return defaults
    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError:
        return defaults

    stored = data.get("integrations", {})
    for key, payload in stored.items():
        if key not in defaults:
            defaults[key] = IntegrationConfig(**payload)
        else:
            merged = defaults[key].dict()
            merged.update(payload)
            defaults[key] = IntegrationConfig(**merged)
    return defaults


def _save_state(integrations: Dict[str, IntegrationConfig]) -> None:
    path = _storage_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "updated_at": datetime.utcnow().isoformat(),
        "integrations": {key: integration.dict() for key, integration in integrations.items()},
    }
    path.write_text(json.dumps(payload, indent=2))


def _sanitize_config(config: Dict[str, Any]) -> Dict[str, Any]:
    blocked_tokens = ("secret", "token", "password", "key", "api_key")
    sanitized: Dict[str, Any] = {}
    for k, v in config.items():
        lowered = k.lower()
        if any(token in lowered for token in blocked_tokens):
            continue
        sanitized[k] = v
    return sanitized


@router.get("/integrations", response_model=IntegrationListResponse)
async def list_integrations():
    integrations = _load_state()
    return IntegrationListResponse(
        integrations=list(integrations.values()),
        updated_at=datetime.utcnow().isoformat(),
    )


@router.post("/integrations/{integration_id}/connect", response_model=IntegrationStatusResponse)
async def connect_integration(integration_id: str, request: IntegrationConnectRequest):
    integrations = _load_state()
    if integration_id not in integrations:
        raise HTTPException(status_code=404, detail="Integration not found")
    integration = integrations[integration_id]
    config = request.config if request.store_sensitive else _sanitize_config(request.config)
    integration.status = "connected"
    integration.config = config
    integration.updated_at = datetime.utcnow().isoformat()
    integrations[integration_id] = integration
    _save_state(integrations)
    return IntegrationStatusResponse(
        id=integration_id,
        status=integration.status,
        updated_at=integration.updated_at,
        message="Integration connected",
    )


@router.post("/integrations/{integration_id}/disconnect", response_model=IntegrationStatusResponse)
async def disconnect_integration(integration_id: str):
    integrations = _load_state()
    if integration_id not in integrations:
        raise HTTPException(status_code=404, detail="Integration not found")
    integration = integrations[integration_id]
    integration.status = "disconnected"
    integration.updated_at = datetime.utcnow().isoformat()
    integrations[integration_id] = integration
    _save_state(integrations)
    return IntegrationStatusResponse(
        id=integration_id,
        status=integration.status,
        updated_at=integration.updated_at,
        message="Integration disconnected",
    )


@router.post("/integrations/{integration_id}/test", response_model=IntegrationStatusResponse)
async def test_integration(integration_id: str):
    integrations = _load_state()
    if integration_id not in integrations:
        raise HTTPException(status_code=404, detail="Integration not found")
    integration = integrations[integration_id]
    status = integration.status
    message = "Integration not connected" if status != "connected" else "Connection check queued"
    return IntegrationStatusResponse(
        id=integration_id,
        status=status,
        updated_at=integration.updated_at,
        message=message,
    )
