'use client';

import React from 'react';
import { Bell, Mail, MessageSquare, Webhook, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { SettingsToggle } from './SettingsToggle';
import { SettingsInput } from './SettingsInput';
import type { NotificationSettings as NotificationSettingsType } from '@/lib/types/settings';

interface NotificationSettingsProps {
  settings: NotificationSettingsType;
  onChange: (key: keyof NotificationSettingsType, value: any) => void;
}

export function NotificationSettings({ settings, onChange }: NotificationSettingsProps) {
  const updateEmail = (key: string, value: any) => {
    onChange('email', { ...settings.email, [key]: value });
  };

  const updateSlack = (key: string, value: any) => {
    onChange('slack', { ...settings.slack, [key]: value });
  };

  const updateWebhook = (key: string, value: any) => {
    onChange('webhook', { ...settings.webhook, [key]: value });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="p-2 bg-pink-100 dark:bg-pink-900 rounded-lg">
          <Bell className="w-5 h-5 text-pink-600 dark:text-pink-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Notifications
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure alerts and notification channels
          </p>
        </div>
      </div>

      {/* Email Notifications */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Notifications
          </h4>
          <SettingsToggle
            label=""
            checked={settings.email.enabled}
            onChange={(v) => updateEmail('enabled', v)}
          />
        </div>

        <div className={settings.email.enabled ? '' : 'opacity-50 pointer-events-none'}>
          <SettingsInput
            label="Recipients"
            value={settings.email.recipients.join(', ')}
            onChange={(v) => updateEmail('recipients', v.split(',').map(e => e.trim()).filter(Boolean))}
            placeholder="email1@example.com, email2@example.com"
            description="Comma-separated list of email addresses"
            disabled={!settings.email.enabled}
          />

          <div className="mt-4 space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notify on:
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => updateEmail('on_complete', !settings.email.on_complete)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  settings.email.on_complete
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                Completion
              </button>
              <button
                onClick={() => updateEmail('on_failure', !settings.email.on_failure)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  settings.email.on_failure
                    ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                <XCircle className="w-4 h-4" />
                Failure
              </button>
              <button
                onClick={() => updateEmail('on_quality_drop', !settings.email.on_quality_drop)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  settings.email.on_quality_drop
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                Quality Drop
              </button>
            </div>
          </div>

          <div className="mt-3">
            <SettingsToggle
              label="Include Summary"
              checked={settings.email.include_summary}
              onChange={(v) => updateEmail('include_summary', v)}
              description="Include crawl statistics in the email"
            />
          </div>
        </div>
      </div>

      {/* Slack Notifications */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Slack Notifications
          </h4>
          <SettingsToggle
            label=""
            checked={settings.slack.enabled}
            onChange={(v) => updateSlack('enabled', v)}
          />
        </div>

        <div className={settings.slack.enabled ? '' : 'opacity-50 pointer-events-none'}>
          <SettingsInput
            label="Webhook URL"
            value={settings.slack.webhook_url}
            onChange={(v) => updateSlack('webhook_url', v)}
            type="url"
            placeholder="https://hooks.slack.com/services/..."
            description="Slack incoming webhook URL"
            disabled={!settings.slack.enabled}
          />

          <div className="mt-3">
            <SettingsInput
              label="Channel"
              value={settings.slack.channel}
              onChange={(v) => updateSlack('channel', v)}
              placeholder="#crawl-alerts"
              description="Channel to post notifications (optional)"
              disabled={!settings.slack.enabled}
            />
          </div>

          <div className="mt-4 space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notify on:
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => updateSlack('on_complete', !settings.slack.on_complete)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  settings.slack.on_complete
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                Completion
              </button>
              <button
                onClick={() => updateSlack('on_failure', !settings.slack.on_failure)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  settings.slack.on_failure
                    ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                <XCircle className="w-4 h-4" />
                Failure
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Webhook Notifications */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <Webhook className="w-4 h-4" />
            Custom Webhook
          </h4>
          <SettingsToggle
            label=""
            checked={settings.webhook.enabled}
            onChange={(v) => updateWebhook('enabled', v)}
          />
        </div>

        <div className={settings.webhook.enabled ? '' : 'opacity-50 pointer-events-none'}>
          <SettingsInput
            label="Webhook URL"
            value={settings.webhook.url}
            onChange={(v) => updateWebhook('url', v)}
            type="url"
            placeholder="https://api.example.com/webhook"
            description="URL to receive POST notifications"
            disabled={!settings.webhook.enabled}
          />

          <div className="mt-4 space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notify on:
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => updateWebhook('on_complete', !settings.webhook.on_complete)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  settings.webhook.on_complete
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                Completion
              </button>
              <button
                onClick={() => updateWebhook('on_failure', !settings.webhook.on_failure)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  settings.webhook.on_failure
                    ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                <XCircle className="w-4 h-4" />
                Failure
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Status */}
      <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-4">
        <h4 className="text-sm font-medium text-pink-700 dark:text-pink-300 mb-3">
          Active Channels
        </h4>
        <div className="flex flex-wrap gap-2">
          {settings.email.enabled && (
            <span className="flex items-center gap-1 px-2 py-1 bg-pink-100 dark:bg-pink-800 text-pink-700 dark:text-pink-300 rounded text-xs">
              <Mail className="w-3 h-3" />
              Email ({settings.email.recipients.length} recipients)
            </span>
          )}
          {settings.slack.enabled && (
            <span className="flex items-center gap-1 px-2 py-1 bg-pink-100 dark:bg-pink-800 text-pink-700 dark:text-pink-300 rounded text-xs">
              <MessageSquare className="w-3 h-3" />
              Slack
            </span>
          )}
          {settings.webhook.enabled && (
            <span className="flex items-center gap-1 px-2 py-1 bg-pink-100 dark:bg-pink-800 text-pink-700 dark:text-pink-300 rounded text-xs">
              <Webhook className="w-3 h-3" />
              Webhook
            </span>
          )}
          {!settings.email.enabled && !settings.slack.enabled && !settings.webhook.enabled && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              No notification channels enabled
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
