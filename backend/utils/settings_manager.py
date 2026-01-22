"""
Settings Manager

Handles loading, saving, and managing crawl settings.
- Load/save settings from file (data/settings.json)
- Get setting by key (dot notation support: "limits.max_pages")
- Update settings with validation
- Reset to defaults
- Export/import settings
"""

import json
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, Union
from functools import reduce
import operator

# Add parent for imports
import sys
backend_dir = os.path.dirname(os.path.dirname(__file__))
sys.path.insert(0, backend_dir)

from models.crawl_settings import (
    CrawlSettings,
    LimitsSettings,
    QualitySettings,
    PerformanceSettings,
    ProcessingSettings,
    OutputSettings,
    BudgetSettings,
    NotificationSettings,
    get_default_settings
)


class SettingsManager:
    """Manages crawl settings persistence and operations."""

    def __init__(self, settings_path: Optional[str] = None):
        """Initialize settings manager.

        Args:
            settings_path: Path to settings JSON file. Defaults to data/settings.json
        """
        if settings_path:
            self.settings_path = Path(settings_path)
        else:
            # Default to data/settings.json relative to project root
            self.settings_path = Path(__file__).parent.parent.parent / "data" / "settings.json"

        # Ensure directory exists
        self.settings_path.parent.mkdir(parents=True, exist_ok=True)

        # Internal state
        self._settings: Optional[CrawlSettings] = None
        self._last_updated: Optional[datetime] = None
        self._active_preset: Optional[str] = None

    def load(self) -> CrawlSettings:
        """Load settings from file, creating defaults if not exists.

        Returns:
            CrawlSettings: The loaded or default settings
        """
        if self.settings_path.exists():
            try:
                with open(self.settings_path, 'r') as f:
                    data = json.load(f)

                # Extract metadata
                self._last_updated = data.get("_meta", {}).get("last_updated")
                self._active_preset = data.get("_meta", {}).get("active_preset")

                # Parse settings
                settings_data = data.get("settings", data)
                self._settings = CrawlSettings(**settings_data)

            except (json.JSONDecodeError, Exception) as e:
                print(f"Error loading settings: {e}. Using defaults.")
                self._settings = get_default_settings()
        else:
            # Create default settings
            self._settings = get_default_settings()
            self.save()

        return self._settings

    def save(self) -> bool:
        """Save current settings to file.

        Returns:
            bool: True if save successful
        """
        if self._settings is None:
            self._settings = get_default_settings()

        self._last_updated = datetime.utcnow().isoformat()

        data = {
            "_meta": {
                "last_updated": self._last_updated,
                "active_preset": self._active_preset,
                "version": "1.0"
            },
            "settings": self._settings.dict()
        }

        try:
            with open(self.settings_path, 'w') as f:
                json.dump(data, f, indent=2, default=str)
            return True
        except Exception as e:
            print(f"Error saving settings: {e}")
            return False

    def get_settings(self) -> CrawlSettings:
        """Get current settings, loading if necessary.

        Returns:
            CrawlSettings: Current settings
        """
        if self._settings is None:
            self.load()
        return self._settings

    def get_value(self, key: str) -> Any:
        """Get a setting value by dot-notation key.

        Examples:
            get_value("limits.max_pages") -> 10000
            get_value("quality.min_quality_score") -> 0.7
            get_value("notifications.email.enabled") -> False

        Args:
            key: Dot-notation path to setting

        Returns:
            The setting value

        Raises:
            KeyError: If key path not found
        """
        settings = self.get_settings()
        settings_dict = settings.dict()

        keys = key.split(".")
        try:
            return reduce(operator.getitem, keys, settings_dict)
        except (KeyError, TypeError) as e:
            raise KeyError(f"Setting key not found: {key}") from e

    def set_value(self, key: str, value: Any) -> bool:
        """Set a setting value by dot-notation key.

        Args:
            key: Dot-notation path to setting
            value: New value to set

        Returns:
            bool: True if successful
        """
        settings = self.get_settings()
        settings_dict = settings.dict()

        keys = key.split(".")

        # Navigate to parent and set value
        try:
            obj = settings_dict
            for k in keys[:-1]:
                obj = obj[k]
            obj[keys[-1]] = value

            # Recreate settings with validation
            self._settings = CrawlSettings(**settings_dict)
            self._active_preset = None  # Clear preset when manually changing
            return self.save()

        except (KeyError, TypeError) as e:
            raise KeyError(f"Setting key not found: {key}") from e

    def update_settings(self, new_settings: Union[CrawlSettings, Dict[str, Any]]) -> CrawlSettings:
        """Update settings with new values.

        Args:
            new_settings: New settings (CrawlSettings or dict)

        Returns:
            CrawlSettings: Updated settings
        """
        if isinstance(new_settings, dict):
            self._settings = CrawlSettings(**new_settings)
        else:
            self._settings = new_settings

        self._active_preset = None  # Clear preset when updating
        self.save()
        return self._settings

    def update_category(self, category: str, data: Dict[str, Any]) -> CrawlSettings:
        """Update a single category of settings.

        Args:
            category: Category name (limits, quality, etc.)
            data: New values for the category

        Returns:
            CrawlSettings: Updated settings
        """
        settings = self.get_settings()
        settings_dict = settings.dict()

        if category not in settings_dict:
            raise ValueError(f"Unknown category: {category}")

        # Merge new data with existing
        settings_dict[category].update(data)

        # Recreate with validation
        self._settings = CrawlSettings(**settings_dict)
        self._active_preset = None
        self.save()

        return self._settings

    def reset_to_defaults(self) -> CrawlSettings:
        """Reset all settings to default values.

        Returns:
            CrawlSettings: Default settings
        """
        self._settings = get_default_settings()
        self._active_preset = None
        self.save()
        return self._settings

    def reset_category(self, category: str) -> CrawlSettings:
        """Reset a single category to defaults.

        Args:
            category: Category name to reset

        Returns:
            CrawlSettings: Updated settings
        """
        defaults = get_default_settings()
        settings = self.get_settings()
        settings_dict = settings.dict()
        defaults_dict = defaults.dict()

        if category not in settings_dict:
            raise ValueError(f"Unknown category: {category}")

        settings_dict[category] = defaults_dict[category]
        self._settings = CrawlSettings(**settings_dict)
        self.save()

        return self._settings

    def apply_preset(self, preset_id: str, presets: Dict[str, CrawlSettings]) -> CrawlSettings:
        """Apply a preset configuration.

        Args:
            preset_id: ID of the preset to apply
            presets: Dictionary of available presets

        Returns:
            CrawlSettings: Applied preset settings
        """
        if preset_id not in presets:
            raise ValueError(f"Unknown preset: {preset_id}")

        self._settings = presets[preset_id]
        self._active_preset = preset_id
        self.save()

        return self._settings

    def export_settings(self) -> Dict[str, Any]:
        """Export settings for sharing/backup.

        Returns:
            Dict containing exportable settings
        """
        settings = self.get_settings()
        return {
            "version": "1.0",
            "exported_at": datetime.utcnow().isoformat(),
            "settings": settings.dict()
        }

    def import_settings(self, data: Dict[str, Any]) -> CrawlSettings:
        """Import settings from exported data.

        Args:
            data: Exported settings data

        Returns:
            CrawlSettings: Imported settings
        """
        settings_data = data.get("settings", data)
        self._settings = CrawlSettings(**settings_data)
        self._active_preset = None
        self.save()

        return self._settings

    @property
    def last_updated(self) -> Optional[str]:
        """Get last updated timestamp."""
        return self._last_updated

    @property
    def active_preset(self) -> Optional[str]:
        """Get active preset ID if any."""
        return self._active_preset

    def get_response_data(self) -> Dict[str, Any]:
        """Get data for API response.

        Returns:
            Dict with settings, last_updated, active_preset
        """
        return {
            "settings": self.get_settings().dict(),
            "last_updated": self._last_updated,
            "active_preset": self._active_preset
        }


# Global singleton instance
_settings_manager: Optional[SettingsManager] = None


def get_settings_manager() -> SettingsManager:
    """Get the global settings manager instance.

    Returns:
        SettingsManager: Singleton instance
    """
    global _settings_manager
    if _settings_manager is None:
        _settings_manager = SettingsManager()
    return _settings_manager
