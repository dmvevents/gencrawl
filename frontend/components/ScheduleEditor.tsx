'use client'

import { useState, useEffect } from 'react'
import {
  Calendar,
  Clock,
  Timer,
  Settings,
  Bell,
  Save,
  X,
} from 'lucide-react'

interface ScheduleFormData {
  name: string
  description: string
  schedule_type: 'once' | 'daily' | 'weekly' | 'monthly' | 'cron'
  cron_expression: string
  timezone: string
  start_date: string
  end_date: string
  max_runs: string
  skip_if_running: boolean
  template_id: string
  notifications: {
    on_complete: boolean
    on_failure: boolean
  }
}

interface ScheduleEditorProps {
  initialData?: Partial<ScheduleFormData>
  onSave: (data: ScheduleFormData) => void
  onCancel: () => void
  isEditing?: boolean
}

const SCHEDULE_PRESETS: { [key: string]: string } = {
  once: '0 0 * * *',
  daily: '0 2 * * *',
  weekly: '0 2 * * 5',
  monthly: '0 2 1 * *',
  cron: '0 2 * * *',
}

const TIMEZONES = [
  { value: 'America/Port_of_Spain', label: 'Trinidad & Tobago (AST)' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
]

const CRON_PRESETS = [
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Daily at 2 AM', value: '0 2 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Weekdays at 8 AM', value: '0 8 * * 1-5' },
  { label: 'Sundays at 6 AM', value: '0 6 * * 0' },
  { label: 'First of month', value: '0 2 1 * *' },
  { label: 'Every Monday', value: '0 2 * * 1' },
]

function formatCronDescription(cron: string): string {
  const parts = cron.split(' ')
  if (parts.length < 5) return 'Invalid cron expression'

  const [minute, hour, day, month, dow] = parts

  // Simple descriptions for common patterns
  if (day === '*' && month === '*') {
    if (dow === '*') {
      if (hour === '*') return `Every hour at minute ${minute}`
      return `Every day at ${hour}:${minute.padStart(2, '0')}`
    }
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    if (dow.includes('-')) {
      const [start, end] = dow.split('-').map(Number)
      return `${days[start]} to ${days[end]} at ${hour}:${minute.padStart(2, '0')}`
    }
    return `Every ${days[parseInt(dow)] || dow} at ${hour}:${minute.padStart(2, '0')}`
  }

  if (day !== '*' && month === '*' && dow === '*') {
    return `Day ${day} of every month at ${hour}:${minute.padStart(2, '0')}`
  }

  return `Custom: ${cron}`
}

function CronBuilder({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [minute, setMinute] = useState('0')
  const [hour, setHour] = useState('2')
  const [day, setDay] = useState('*')
  const [month, setMonth] = useState('*')
  const [dow, setDow] = useState('*')

  useEffect(() => {
    const parts = value.split(' ')
    if (parts.length >= 5) {
      setMinute(parts[0])
      setHour(parts[1])
      setDay(parts[2])
      setMonth(parts[3])
      setDow(parts[4])
    }
  }, [value])

  const updateCron = (m: string, h: string, d: string, mo: string, dw: string) => {
    onChange(`${m} ${h} ${d} ${mo} ${dw}`)
  }

  return (
    <div className="space-y-4">
      {/* Quick Presets */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Quick Presets
        </label>
        <div className="flex flex-wrap gap-2">
          {CRON_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange(preset.value)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                value === preset.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Manual Builder */}
      <div className="grid grid-cols-5 gap-2">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Minute
          </label>
          <input
            type="text"
            value={minute}
            onChange={(e) => {
              setMinute(e.target.value)
              updateCron(e.target.value, hour, day, month, dow)
            }}
            className="w-full px-2 py-1 text-sm border dark:border-gray-700 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Hour
          </label>
          <input
            type="text"
            value={hour}
            onChange={(e) => {
              setHour(e.target.value)
              updateCron(minute, e.target.value, day, month, dow)
            }}
            className="w-full px-2 py-1 text-sm border dark:border-gray-700 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
            placeholder="*"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Day
          </label>
          <input
            type="text"
            value={day}
            onChange={(e) => {
              setDay(e.target.value)
              updateCron(minute, hour, e.target.value, month, dow)
            }}
            className="w-full px-2 py-1 text-sm border dark:border-gray-700 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
            placeholder="*"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Month
          </label>
          <input
            type="text"
            value={month}
            onChange={(e) => {
              setMonth(e.target.value)
              updateCron(minute, hour, day, e.target.value, dow)
            }}
            className="w-full px-2 py-1 text-sm border dark:border-gray-700 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
            placeholder="*"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Day of Week
          </label>
          <input
            type="text"
            value={dow}
            onChange={(e) => {
              setDow(e.target.value)
              updateCron(minute, hour, day, month, e.target.value)
            }}
            className="w-full px-2 py-1 text-sm border dark:border-gray-700 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
            placeholder="*"
          />
        </div>
      </div>

      {/* Description */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
          <Clock className="w-4 h-4" />
          <span>{formatCronDescription(value)}</span>
        </div>
      </div>
    </div>
  )
}

export function ScheduleEditor({
  initialData,
  onSave,
  onCancel,
  isEditing = false,
}: ScheduleEditorProps) {
  const [formData, setFormData] = useState<ScheduleFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    schedule_type: initialData?.schedule_type || 'daily',
    cron_expression: initialData?.cron_expression || '0 2 * * *',
    timezone: initialData?.timezone || 'America/Port_of_Spain',
    start_date: initialData?.start_date || '',
    end_date: initialData?.end_date || '',
    max_runs: initialData?.max_runs || '',
    skip_if_running: initialData?.skip_if_running ?? true,
    template_id: initialData?.template_id || '',
    notifications: initialData?.notifications || {
      on_complete: true,
      on_failure: true,
    },
  })

  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleTypeChange = (type: ScheduleFormData['schedule_type']) => {
    setFormData({
      ...formData,
      schedule_type: type,
      cron_expression: SCHEDULE_PRESETS[type] || formData.cron_expression,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Basic Information
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Schedule Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Daily SEA Materials Check"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Automatically crawl for new SEA materials daily"
            rows={2}
          />
        </div>
      </div>

      {/* Schedule Type */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Schedule Frequency
        </h3>

        <div className="grid grid-cols-5 gap-2">
          {(['once', 'daily', 'weekly', 'monthly', 'cron'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleTypeChange(type)}
              className={`px-4 py-2 rounded-lg capitalize transition-colors ${
                formData.schedule_type === type
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {formData.schedule_type === 'cron' && (
          <CronBuilder
            value={formData.cron_expression}
            onChange={(value) => setFormData({ ...formData, cron_expression: value })}
          />
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Timezone
          </label>
          <select
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Template Selection */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Timer className="w-5 h-5" />
          Crawl Configuration
        </h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Template ID
          </label>
          <input
            type="text"
            value={formData.template_id}
            onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
            className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="sea-materials"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Enter a template ID or leave blank to use custom configuration
          </p>
        </div>
      </div>

      {/* Advanced Options */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced Options
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Maximum Runs (leave blank for unlimited)
              </label>
              <input
                type="number"
                value={formData.max_runs}
                onChange={(e) => setFormData({ ...formData, max_runs: e.target.value })}
                className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Unlimited"
                min="1"
              />
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.skip_if_running}
                onChange={(e) => setFormData({ ...formData, skip_if_running: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Skip if previous crawl is still running
              </span>
            </label>

            {/* Notifications */}
            <div className="pt-4 border-t dark:border-gray-700">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notifications
              </h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.notifications.on_complete}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notifications: { ...formData.notifications, on_complete: e.target.checked },
                      })
                    }
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Notify on completion
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.notifications.on_failure}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notifications: { ...formData.notifications, on_failure: e.target.checked },
                      })
                    }
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Notify on failure
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {isEditing ? 'Update Schedule' : 'Create Schedule'}
        </button>
      </div>
    </form>
  )
}

export default ScheduleEditor
