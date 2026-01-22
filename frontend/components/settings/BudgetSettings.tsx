'use client';

import React from 'react';
import { DollarSign, AlertTriangle, PauseCircle, StopCircle, Calculator } from 'lucide-react';
import { SettingsSlider } from './SettingsSlider';
import { SettingsToggle } from './SettingsToggle';
import type { BudgetSettings as BudgetSettingsType } from '@/lib/types/settings';

interface BudgetSettingsProps {
  settings: BudgetSettingsType;
  onChange: (key: keyof BudgetSettingsType, value: any) => void;
}

export function BudgetSettings({ settings, onChange }: BudgetSettingsProps) {
  // Calculate estimated costs
  const estimatedPages = 10000; // Example for preview
  const estimatedCost = estimatedPages * settings.cost_per_page_estimate;
  const warnAt = settings.max_api_cost_usd * (settings.warn_at_percentage / 100);
  const pauseAt = settings.max_api_cost_usd * (settings.pause_at_percentage / 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
          <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Budget
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Cost limits and spending controls
          </p>
        </div>
      </div>

      {/* Cost Limits */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Cost Limits
        </h4>

        <SettingsSlider
          label="Maximum API Cost"
          value={settings.max_api_cost_usd}
          min={0}
          max={1000}
          step={1}
          onChange={(v) => onChange('max_api_cost_usd', v)}
          formatValue={(v) => `$${v.toFixed(2)}`}
          description="Maximum LLM API cost allowed for this crawl"
        />

        <SettingsSlider
          label="Cost Per Page Estimate"
          value={settings.cost_per_page_estimate}
          min={0}
          max={0.1}
          step={0.0001}
          onChange={(v) => onChange('cost_per_page_estimate', v)}
          formatValue={(v) => `$${v.toFixed(4)}`}
          description="Estimated cost per page for budget calculations"
        />
      </div>

      {/* Warning Thresholds */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Warning Thresholds
        </h4>

        <SettingsSlider
          label="Warn at Percentage"
          value={settings.warn_at_percentage}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(v) => onChange('warn_at_percentage', v)}
          description="Show warning when budget reaches this percentage"
        />

        <SettingsSlider
          label="Pause at Percentage"
          value={settings.pause_at_percentage}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(v) => onChange('pause_at_percentage', v)}
          description="Auto-pause crawl when budget reaches this percentage"
        />

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <SettingsToggle
            label="Hard Stop at 100%"
            checked={settings.hard_stop_at_100}
            onChange={(v) => onChange('hard_stop_at_100', v)}
            description="Immediately stop crawl when budget is exhausted (cannot be resumed)"
          />

          <SettingsToggle
            label="Track Token Usage"
            checked={settings.track_token_usage}
            onChange={(v) => onChange('track_token_usage', v)}
            description="Track and log LLM token usage for accurate cost tracking"
          />
        </div>
      </div>

      {/* Budget Visualization */}
      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
        <h4 className="text-sm font-medium text-green-700 dark:text-green-300 mb-3 flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          Budget Overview
        </h4>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>$0</span>
            <span>${settings.max_api_cost_usd.toFixed(2)}</span>
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
            {/* Warn threshold marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-yellow-500 z-10"
              style={{ left: `${settings.warn_at_percentage}%` }}
              title={`Warn at $${warnAt.toFixed(2)}`}
            />
            {/* Pause threshold marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-orange-500 z-10"
              style={{ left: `${settings.pause_at_percentage}%` }}
              title={`Pause at $${pauseAt.toFixed(2)}`}
            />
            {/* Budget bar */}
            <div
              className="h-full bg-gradient-to-r from-green-400 to-green-500"
              style={{ width: '0%' }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
              <AlertTriangle className="w-3 h-3" />
              Warn: ${warnAt.toFixed(2)}
            </span>
            <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
              <PauseCircle className="w-3 h-3" />
              Pause: ${pauseAt.toFixed(2)}
            </span>
            {settings.hard_stop_at_100 && (
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <StopCircle className="w-3 h-3" />
                Stop: ${settings.max_api_cost_usd.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Estimates */}
        <div className="grid grid-cols-2 gap-4 text-sm pt-3 border-t border-green-200 dark:border-green-800">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Est. pages at budget:</span>
            <p className="font-semibold text-gray-900 dark:text-white">
              ~{Math.floor(settings.max_api_cost_usd / settings.cost_per_page_estimate).toLocaleString()} pages
            </p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Est. cost for 10k pages:</span>
            <p className="font-semibold text-gray-900 dark:text-white">
              ${(10000 * settings.cost_per_page_estimate).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
