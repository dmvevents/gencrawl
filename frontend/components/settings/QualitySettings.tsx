'use client';

import React from 'react';
import { Shield, Target, Copy, FileText, AlertTriangle } from 'lucide-react';
import { SettingsSlider } from './SettingsSlider';
import { SettingsToggle } from './SettingsToggle';
import { SettingsSelect } from './SettingsSelect';
import type { QualitySettings as QualitySettingsType, QualityAction } from '@/lib/types/settings';

interface QualitySettingsProps {
  settings: QualitySettingsType;
  onChange: (key: keyof QualitySettingsType, value: any) => void;
}

export function QualitySettings({ settings, onChange }: QualitySettingsProps) {
  const qualityActionOptions = [
    { value: 'continue', label: 'Continue (ignore failures)' },
    { value: 'pause', label: 'Pause (wait for review)' },
    { value: 'stop', label: 'Stop (abort crawl)' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
          <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Quality Gates
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Set quality thresholds and validation rules
          </p>
        </div>
      </div>

      {/* Score Thresholds */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Target className="w-4 h-4" />
          Score Thresholds
        </h4>

        <SettingsSlider
          label="Minimum Quality Score"
          value={settings.min_quality_score}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => onChange('min_quality_score', v)}
          formatValue={(v) => `${(v * 100).toFixed(0)}%`}
          description="Reject documents below this quality score"
        />

        <SettingsSlider
          label="Minimum Relevance Score"
          value={settings.min_relevance_score}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => onChange('min_relevance_score', v)}
          formatValue={(v) => `${(v * 100).toFixed(0)}%`}
          description="Reject documents below this relevance score"
        />

        <SettingsSlider
          label="Quality Threshold Percentage"
          value={settings.quality_threshold_percentage}
          min={0}
          max={100}
          step={5}
          unit="%"
          onChange={(v) => onChange('quality_threshold_percentage', v)}
          description="Percentage of documents that must pass quality checks"
        />
      </div>

      {/* Duplicate Detection */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Copy className="w-4 h-4" />
          Duplicate Detection
        </h4>

        <SettingsSlider
          label="Maximum Duplicate Percentage"
          value={settings.max_duplicate_percentage}
          min={0}
          max={100}
          step={1}
          unit="%"
          onChange={(v) => onChange('max_duplicate_percentage', v)}
          description="Stop crawl if duplicate rate exceeds this"
        />
      </div>

      {/* Content Requirements */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Content Requirements
        </h4>

        <SettingsSlider
          label="Minimum Text Length"
          value={settings.min_text_length}
          min={0}
          max={10000}
          step={50}
          unit="chars"
          onChange={(v) => onChange('min_text_length', v)}
          description="Minimum characters in extracted text"
        />

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <SettingsToggle
            label="Require Publish Date"
            checked={settings.require_date}
            onChange={(v) => onChange('require_date', v)}
            description="Only accept documents with a detected publish date"
          />
        </div>

        {/* Required Metadata */}
        <div className="pt-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Required Metadata Fields
          </label>
          <div className="flex flex-wrap gap-2">
            {['title', 'author', 'date', 'description', 'keywords'].map((field) => (
              <button
                key={field}
                onClick={() => {
                  const current = settings.require_metadata || [];
                  if (current.includes(field)) {
                    onChange('require_metadata', current.filter((f) => f !== field));
                  } else {
                    onChange('require_metadata', [...current, field]);
                  }
                }}
                className={`
                  px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                  ${settings.require_metadata?.includes(field)
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }
                `}
              >
                {field}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Documents missing these fields will be rejected
          </p>
        </div>
      </div>

      {/* Quality Gate Actions */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Quality Gate Controls
        </h4>

        <SettingsSlider
          label="Quality Check Interval"
          value={settings.quality_check_interval}
          min={10}
          max={1000}
          step={10}
          unit="docs"
          onChange={(v) => onChange('quality_check_interval', v)}
          description="Check quality metrics every N documents"
        />

        <SettingsSelect
          label="Action on Quality Gate Failure"
          value={settings.quality_gate_action}
          options={qualityActionOptions}
          onChange={(v) => onChange('quality_gate_action', v as QualityAction)}
          description="What to do when quality thresholds are not met"
        />

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <SettingsToggle
            label="Stop on Quality Drop"
            checked={settings.stop_on_quality_drop}
            onChange={(v) => onChange('stop_on_quality_drop', v)}
            description="Pause crawl if quality drops significantly"
          />
        </div>
      </div>
    </div>
  );
}
