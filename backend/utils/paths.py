from __future__ import annotations

import os
from pathlib import Path


def get_repo_root() -> Path:
    """Return repo root with optional override for deployments."""
    override = os.getenv("GENCRAWL_ROOT")
    if override:
        return Path(override)
    return Path(__file__).resolve().parents[2]


def get_log_dir() -> Path:
    """Return the crawl logs directory with optional override."""
    override = os.getenv("GENCRAWL_LOG_DIR")
    if override:
        return Path(override)
    return get_repo_root() / "logs"
