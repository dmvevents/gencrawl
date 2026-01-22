'use client';

import React from 'react';
import { Gauge, Clock, HardDrive, Layers, RotateCcw } from 'lucide-react';
import { SettingsSlider } from './SettingsSlider';
import { SettingsToggle } from './SettingsToggle';
import type { LimitsSettings as LimitsSettingsType } from '@/lib/types/settings';

interface LimitsSettingsProps {
  settings: LimitsSettingsType;
  onChange: (key: keyof LimitsSettingsType, value: any) => void;
}

export function LimitsSettings({ settings, onChange }: LimitsSettingsProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <Gauge className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Limits & Constraints
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Control crawl boundaries and resource usage
          </p>
        </div>
      </div>

      {/* Page Limits */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Page & Document Limits
        </h4>

        <SettingsSlider
          label="Maximum Pages to Crawl"
          value={settings.max_pages}
          min={0}
          max={100000}
          step={100}
          onChange={(v) => onChange('max_pages', v)}
          formatValue={(v) => v === 0 ? 'Unlimited' : v.toLocaleString()}
          description="Set to 0 for unlimited"
        />

        <SettingsSlider
          label="Maximum Documents to Download"
          value={settings.max_documents}
          min={0}
          max={50000}
          step={100}
          onChange={(v) => onChange('max_documents', v)}
          formatValue={(v) => v === 0 ? 'Unlimited' : v.toLocaleString()}
        />

        <SettingsSlider
          label="Maximum Link Depth"
          value={settings.max_depth}
          min={1}
          max={20}
          step={1}
          onChange={(v) => onChange('max_depth', v)}
          description="How many link levels to follow from the starting URL"
        />
      </div>

      {/* Time Limits */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Time Limits
        </h4>

        <SettingsSlider
          label="Maximum Duration"
          value={settings.max_duration_minutes}
          min={0}
          max={1440}
          step={15}
          unit="minutes"
          onChange={(v) => onChange('max_duration_minutes', v)}
          formatValue={(v) => {
            if (v === 0) return 'Unlimited';
            if (v < 60) return `${v} min`;
            return `${Math.floor(v / 60)}h ${v % 60}m`;
          }}
        />

        <SettingsSlider
          label="Request Timeout"
          value={settings.timeout_seconds}
          min={5}
          max={300}
          step={5}
          unit="seconds"
          onChange={(v) => onChange('timeout_seconds', v)}
          description="Timeout for individual requests"
        />
      </div>

      {/* Size Limits */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <HardDrive className="w-4 h-4" />
          Size Limits
        </h4>

        <SettingsSlider
          label="Maximum File Size"
          value={settings.max_file_size_mb}
          min={1}
          max={500}
          step={1}
          unit="MB"
          onChange={(v) => onChange('max_file_size_mb', v)}
          description="Skip files larger than this"
        />

        <SettingsSlider
          label="Maximum Total Size"
          value={settings.max_total_size_gb}
          min={1}
          max={100}
          step={1}
          unit="GB"
          onChange={(v) => onChange('max_total_size_gb', v)}
          description="Total download size limit"
        />

        <SettingsSlider
          label="Minimum File Size"
          value={settings.min_file_size_kb}
          min={0}
          max={1000}
          step={5}
          unit="KB"
          onChange={(v) => onChange('min_file_size_kb', v)}
          description="Skip files smaller than this"
        />
      </div>

      {/* Retry Settings */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <RotateCcw className="w-4 h-4" />
          Retry & Control Settings
        </h4>

        <SettingsSlider
          label="Maximum Retries"
          value={settings.max_retries}
          min={0}
          max={10}
          step={1}
          onChange={(v) => onChange('max_retries', v)}
          description="Retry failed requests this many times"
        />

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <SettingsToggle
            label="Enable Budget Controls"
            checked={settings.enable_budget_controls}
            onChange={(v) => onChange('enable_budget_controls', v)}
            description="Enforce limits and show warnings"
          />

          <SettingsToggle
            label="Pause at Limit"
            checked={settings.pause_at_limit}
            onChange={(v) => onChange('pause_at_limit', v)}
            description="Automatically pause when approaching limits"
          />
        </div>
      </div>
    </div>
  );
}
