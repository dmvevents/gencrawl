'use client';

import React from 'react';
import { Zap, Globe, Clock, Server, ArrowLeftRight } from 'lucide-react';
import { SettingsSlider } from './SettingsSlider';
import { SettingsToggle } from './SettingsToggle';
import { SettingsInput } from './SettingsInput';
import type { PerformanceSettings as PerformanceSettingsType } from '@/lib/types/settings';

interface PerformanceSettingsProps {
  settings: PerformanceSettingsType;
  onChange: (key: keyof PerformanceSettingsType, value: any) => void;
}

export function PerformanceSettings({ settings, onChange }: PerformanceSettingsProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
          <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Performance
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure crawl speed and politeness settings
          </p>
        </div>
      </div>

      {/* Concurrency & Speed */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Server className="w-4 h-4" />
          Concurrency & Speed
        </h4>

        <SettingsSlider
          label="Concurrent Requests"
          value={settings.concurrent_requests}
          min={1}
          max={50}
          step={1}
          onChange={(v) => onChange('concurrent_requests', v)}
          description="Maximum parallel requests"
        />

        <SettingsSlider
          label="Delay Between Requests"
          value={settings.delay_seconds}
          min={0}
          max={30}
          step={0.1}
          unit="seconds"
          onChange={(v) => onChange('delay_seconds', v)}
          formatValue={(v) => v.toFixed(1)}
          description="Wait time between requests to the same domain"
        />

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <SettingsToggle
            label="Adaptive Delay"
            checked={settings.adaptive_delay}
            onChange={(v) => onChange('adaptive_delay', v)}
            description="Automatically adjust delay based on server response times"
          />

          <SettingsToggle
            label="Rate Limit Backoff"
            checked={settings.rate_limit_backoff}
            onChange={(v) => onChange('rate_limit_backoff', v)}
            description="Automatically slow down when rate limited (429 responses)"
          />
        </div>
      </div>

      {/* Politeness */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Politeness Settings
        </h4>

        <SettingsToggle
          label="Respect robots.txt"
          checked={settings.respect_robots_txt}
          onChange={(v) => onChange('respect_robots_txt', v)}
          description="Honor robots.txt disallow directives"
        />

        <SettingsInput
          label="User Agent"
          value={settings.user_agent}
          onChange={(v) => onChange('user_agent', v)}
          placeholder="GenCrawl/1.0 (+https://gencrawl.io/bot)"
          description="HTTP User-Agent header sent with requests"
        />
      </div>

      {/* Redirects */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4" />
          Redirect Handling
        </h4>

        <SettingsToggle
          label="Follow Redirects"
          checked={settings.follow_redirects}
          onChange={(v) => onChange('follow_redirects', v)}
          description="Follow HTTP 3xx redirects"
        />

        <SettingsSlider
          label="Maximum Redirects"
          value={settings.max_redirects}
          min={0}
          max={20}
          step={1}
          onChange={(v) => onChange('max_redirects', v)}
          description="Maximum redirect chain length to follow"
          disabled={!settings.follow_redirects}
        />
      </div>

      {/* Caching & Compression */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Caching & Compression
        </h4>

        <SettingsToggle
          label="Enable Response Caching"
          checked={settings.enable_caching}
          onChange={(v) => onChange('enable_caching', v)}
          description="Cache responses to avoid re-downloading unchanged content"
        />

        <SettingsToggle
          label="Request Compression"
          checked={settings.enable_compression}
          onChange={(v) => onChange('enable_compression', v)}
          description="Request gzip/deflate compressed responses"
        />
      </div>

      {/* Performance Preview */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
          Estimated Performance
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Theoretical max speed:</span>
            <p className="font-semibold text-gray-900 dark:text-white">
              ~{Math.round((settings.concurrent_requests * 60) / Math.max(settings.delay_seconds, 0.1)).toLocaleString()} pages/min
            </p>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Politeness level:</span>
            <p className="font-semibold text-gray-900 dark:text-white">
              {settings.delay_seconds >= 2 ? 'Conservative' :
               settings.delay_seconds >= 1 ? 'Balanced' :
               settings.delay_seconds >= 0.5 ? 'Fast' : 'Aggressive'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
