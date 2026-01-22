/**
 * Settings API Client
 *
 * Functions for interacting with the settings API endpoints.
 */

import type {
  CrawlSettings,
  SettingsResponse,
  UpdateResponse,
  PresetConfig,
  PresetListResponse,
} from '../types/settings';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

/**
 * Fetch all current settings
 */
export async function getSettings(): Promise<SettingsResponse> {
  const response = await fetch(`${API_BASE}/settings`);
  if (!response.ok) {
    throw new Error('Failed to fetch settings');
  }
  return response.json();
}

/**
 * Fetch settings for a specific category
 */
export async function getCategorySettings(category: string): Promise<{ category: string; settings: Record<string, any> }> {
  const response = await fetch(`${API_BASE}/settings/${category}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${category} settings`);
  }
  return response.json();
}

/**
 * Update all settings
 */
export async function updateSettings(settings: CrawlSettings): Promise<UpdateResponse> {
  const response = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to update settings');
  }
  return response.json();
}

/**
 * Update a specific category
 */
export async function updateCategorySettings(
  category: string,
  data: Record<string, any>
): Promise<UpdateResponse> {
  const response = await fetch(`${API_BASE}/settings/${category}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `Failed to update ${category} settings`);
  }
  return response.json();
}

/**
 * Reset all settings to defaults
 */
export async function resetSettings(): Promise<UpdateResponse> {
  const response = await fetch(`${API_BASE}/settings/reset`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error('Failed to reset settings');
  }
  return response.json();
}

/**
 * Reset a specific category to defaults
 */
export async function resetCategorySettings(category: string): Promise<UpdateResponse> {
  const response = await fetch(`${API_BASE}/settings/reset/${category}`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to reset ${category} settings`);
  }
  return response.json();
}

/**
 * Get all available presets
 */
export async function getPresets(): Promise<PresetListResponse> {
  const response = await fetch(`${API_BASE}/settings/presets`);
  if (!response.ok) {
    throw new Error('Failed to fetch presets');
  }
  return response.json();
}

/**
 * Get a specific preset
 */
export async function getPreset(presetId: string): Promise<PresetConfig> {
  const response = await fetch(`${API_BASE}/settings/presets/${presetId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch preset ${presetId}`);
  }
  return response.json();
}

/**
 * Apply a preset configuration
 */
export async function applyPreset(presetId: string): Promise<{
  success: boolean;
  preset_id: string;
  preset_name: string;
  settings: CrawlSettings;
}> {
  const response = await fetch(`${API_BASE}/settings/presets/${presetId}/apply`, {
    method: 'POST',
  });
  if (!response.ok) {
    throw new Error(`Failed to apply preset ${presetId}`);
  }
  return response.json();
}

/**
 * Export settings for backup
 */
export async function exportSettings(): Promise<{
  version: string;
  exported_at: string;
  settings: CrawlSettings;
}> {
  const response = await fetch(`${API_BASE}/settings/export`);
  if (!response.ok) {
    throw new Error('Failed to export settings');
  }
  return response.json();
}

/**
 * Import settings from exported data
 */
export async function importSettings(data: {
  version?: string;
  settings: CrawlSettings;
}): Promise<UpdateResponse> {
  const response = await fetch(`${API_BASE}/settings/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to import settings');
  }
  return response.json();
}

/**
 * Get default settings without changing current
 */
export async function getDefaultSettings(): Promise<{ settings: CrawlSettings }> {
  const response = await fetch(`${API_BASE}/settings/defaults`);
  if (!response.ok) {
    throw new Error('Failed to fetch default settings');
  }
  return response.json();
}

/**
 * Get a specific setting value by key path
 */
export async function getSettingValue(key: string): Promise<{ key: string; value: any }> {
  const response = await fetch(`${API_BASE}/settings/value/${key}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch setting ${key}`);
  }
  return response.json();
}

/**
 * Set a specific setting value by key path
 */
export async function setSettingValue(key: string, value: any): Promise<{ key: string; value: any; success: boolean }> {
  const response = await fetch(`${API_BASE}/settings/value/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || `Failed to set setting ${key}`);
  }
  return response.json();
}
