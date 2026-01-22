'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Gauge, Shield, Zap, Cpu, FileOutput, DollarSign, Bell,
  Save, RotateCcw, Download, Upload, AlertCircle, Check, Loader2,
} from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import {
  LimitsSettings,
  QualitySettings,
  PerformanceSettings,
  ProcessingSettings,
  OutputSettings,
  BudgetSettings,
  NotificationSettings,
  PresetSelector,
} from '@/components/settings';
import type {
  CrawlSettings,
  PresetConfig,
  LimitsSettings as LimitsType,
  QualitySettings as QualityType,
  PerformanceSettings as PerformanceType,
  ProcessingSettings as ProcessingType,
  OutputSettings as OutputType,
  BudgetSettings as BudgetType,
  NotificationSettings as NotificationType,
} from '@/lib/types/settings';
import { defaultSettings } from '@/lib/types/settings';
import * as settingsApi from '@/lib/api/settings';

type CategoryId = 'limits' | 'quality' | 'performance' | 'processing' | 'output' | 'budget' | 'notifications';

interface Category {
  id: CategoryId;
  name: string;
  icon: React.ElementType;
  color: string;
}

const categories: Category[] = [
  { id: 'limits', name: 'Limits & Constraints', icon: Gauge, color: 'blue' },
  { id: 'quality', name: 'Quality Gates', icon: Shield, color: 'green' },
  { id: 'performance', name: 'Performance', icon: Zap, color: 'yellow' },
  { id: 'processing', name: 'Processing', icon: Cpu, color: 'purple' },
  { id: 'output', name: 'Output', icon: FileOutput, color: 'orange' },
  { id: 'budget', name: 'Budget', icon: DollarSign, color: 'green' },
  { id: 'notifications', name: 'Notifications', icon: Bell, color: 'pink' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<CrawlSettings>(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState<CrawlSettings>(defaultSettings);
  const [presets, setPresets] = useState<PresetConfig[]>([]);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryId>('limits');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load settings and presets on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [settingsData, presetsData] = await Promise.all([
          settingsApi.getSettings(),
          settingsApi.getPresets(),
        ]);

        setSettings(settingsData.settings);
        setOriginalSettings(settingsData.settings);
        setActivePreset(settingsData.active_preset);
        setPresets(presetsData.presets);
      } catch (error) {
        console.error('Failed to load settings:', error);
        setErrorMessage('Failed to load settings. Using defaults.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Track changes
  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);
  }, [settings, originalSettings]);

  // Clear save status after delay
  useEffect(() => {
    if (saveStatus !== 'idle') {
      const timer = setTimeout(() => setSaveStatus('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  // Handle settings changes
  const handleSettingsChange = useCallback(
    <K extends CategoryId>(category: K, key: string, value: any) => {
      setSettings((prev) => ({
        ...prev,
        [category]: {
          ...prev[category],
          [key]: value,
        },
      }));
      setActivePreset(null); // Clear active preset when settings change
    },
    []
  );

  // Save settings
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorMessage(null);
      await settingsApi.updateSettings(settings);
      setOriginalSettings(settings);
      setSaveStatus('success');
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      setErrorMessage(error.message || 'Failed to save settings');
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) return;

    try {
      setIsResetting(true);
      setErrorMessage(null);
      const result = await settingsApi.resetSettings();
      setSettings(result.settings);
      setOriginalSettings(result.settings);
      setActivePreset(null);
      setSaveStatus('success');
    } catch (error: any) {
      console.error('Failed to reset settings:', error);
      setErrorMessage(error.message || 'Failed to reset settings');
      setSaveStatus('error');
    } finally {
      setIsResetting(false);
    }
  };

  // Cancel changes
  const handleCancel = () => {
    setSettings(originalSettings);
    setErrorMessage(null);
  };

  // Apply preset
  const handleApplyPreset = async (presetId: string) => {
    try {
      setErrorMessage(null);
      const result = await settingsApi.applyPreset(presetId);
      setSettings(result.settings);
      setOriginalSettings(result.settings);
      setActivePreset(result.preset_id);
      setSaveStatus('success');
    } catch (error: any) {
      console.error('Failed to apply preset:', error);
      setErrorMessage(error.message || 'Failed to apply preset');
      throw error;
    }
  };

  // Export settings
  const handleExport = async () => {
    try {
      const data = await settingsApi.exportSettings();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gencrawl-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export settings:', error);
      setErrorMessage('Failed to export settings');
    }
  };

  // Import settings
  const handleImport = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const result = await settingsApi.importSettings(data);
        setSettings(result.settings);
        setOriginalSettings(result.settings);
        setActivePreset(null);
        setSaveStatus('success');
      } catch (error: any) {
        console.error('Failed to import settings:', error);
        setErrorMessage(error.message || 'Failed to import settings. Invalid format.');
      }
    };
    input.click();
  };

  // Render category content
  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'limits':
        return (
          <LimitsSettings
            settings={settings.limits}
            onChange={(key, value) => handleSettingsChange('limits', key, value)}
          />
        );
      case 'quality':
        return (
          <QualitySettings
            settings={settings.quality}
            onChange={(key, value) => handleSettingsChange('quality', key, value)}
          />
        );
      case 'performance':
        return (
          <PerformanceSettings
            settings={settings.performance}
            onChange={(key, value) => handleSettingsChange('performance', key, value)}
          />
        );
      case 'processing':
        return (
          <ProcessingSettings
            settings={settings.processing}
            onChange={(key, value) => handleSettingsChange('processing', key, value)}
          />
        );
      case 'output':
        return (
          <OutputSettings
            settings={settings.output}
            onChange={(key, value) => handleSettingsChange('output', key, value)}
          />
        );
      case 'budget':
        return (
          <BudgetSettings
            settings={settings.budget}
            onChange={(key, value) => handleSettingsChange('budget', key, value)}
          />
        );
      case 'notifications':
        return (
          <NotificationSettings
            settings={settings.notifications}
            onChange={(key, value) => handleSettingsChange('notifications', key, value)}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--gc-accent)]" />
          <p className="text-[var(--gc-muted)]">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Configuration"
        title="Crawl Settings"
        description="Configure default limits, quality gates, and output behavior for new crawls."
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              className="gc-icon-button"
              title="Export settings"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={handleImport}
              className="gc-icon-button"
              title="Import settings"
            >
              <Upload className="w-5 h-5" />
            </button>
          </div>
        }
      />

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 dark:text-red-300 font-medium">Error</p>
            <p className="text-red-600 dark:text-red-400 text-sm">{errorMessage}</p>
          </div>
        </div>
      )}

      <div className="gc-panel p-4">
        <label className="block text-sm font-medium text-[var(--gc-muted)] mb-2">
          Quick Start with a Preset
        </label>
        <PresetSelector
          presets={presets}
          activePreset={activePreset}
          onApplyPreset={handleApplyPreset}
          isLoading={isLoading}
        />
      </div>

      <div className="flex gap-6">
        <div className="w-64 flex-shrink-0">
          <nav className="sticky top-6 gc-panel overflow-hidden">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`
                      w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                      ${isActive
                        ? 'bg-[var(--gc-accent-soft)] text-[var(--gc-accent-strong)] border-l-4 border-[var(--gc-accent)]'
                        : 'text-[var(--gc-muted)] hover:bg-[var(--gc-surface-muted)] border-l-4 border-transparent'
                      }
                    `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? '' : 'text-gray-400'}`} />
                  <span className="font-medium text-sm">{cat.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="flex-1">
          <div className="gc-panel p-6">
            {renderCategoryContent()}
          </div>
        </div>
      </div>

      <div
        className={`
            fixed bottom-0 left-0 right-0 bg-[var(--gc-surface)] border-t border-[var(--gc-border)]
            p-4 shadow-lg transition-transform duration-300
            ${hasChanges ? 'translate-y-0' : 'translate-y-full'}
          `}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {saveStatus === 'success' && (
              <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Check className="w-5 h-5" />
                Settings saved!
              </span>
            )}
            {hasChanges && saveStatus === 'idle' && (
              <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-5 h-5" />
                You have unsaved changes
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="px-4 py-2 text-[var(--gc-ink)] hover:bg-[var(--gc-surface-muted)] rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isResetting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              Reset to Defaults
            </button>

            <button
              onClick={handleCancel}
              disabled={!hasChanges}
              className="px-4 py-2 text-[var(--gc-ink)] hover:bg-[var(--gc-surface-muted)] rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="px-6 py-2 bg-[var(--gc-accent)] text-white rounded-lg hover:bg-[var(--gc-accent-strong)] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="h-20" />
    </div>
  );
}
