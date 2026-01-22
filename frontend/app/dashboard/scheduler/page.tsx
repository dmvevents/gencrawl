'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Calendar,
  Clock,
  Play,
  Pause,
  Trash2,
  Edit,
  Plus,
  History,
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCcw,
  CalendarClock,
  Zap,
  Settings,
  Timer,
} from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { API_BASE } from '@/lib/api/config'

interface ScheduleRunRecord {
  run_id: string
  crawl_id: string
  scheduled_at: string
  started_at: string
  completed_at: string | null
  status: string
  documents_found: number
  error_message: string | null
  duration_seconds: number | null
}

interface Schedule {
  id: string
  name: string
  description: string
  schedule_type: string
  cron_expression: string
  timezone: string
  next_run: string | null
  last_run: string | null
  status: string
  template_id: string | null
  run_count: number
  max_runs: number | null
  run_history: ScheduleRunRecord[]
  created_at: string
}

interface SchedulerStats {
  running: boolean
  total_schedules: number
  active_count: number
  paused_count: number
  total_runs: number
}

function formatCron(cron: string, type: string): string {
  const cronDescriptions: { [key: string]: string } = {
    '0 2 * * *': 'Every day at 2:00 AM',
    '0 2 * * 5': 'Every Friday at 2:00 AM',
    '0 2 1 * *': 'First of every month at 2:00 AM',
    '0 0 * * *': 'Every day at midnight',
  }

  if (cronDescriptions[cron]) return cronDescriptions[cron]

  // Parse cron for common patterns
  const parts = cron.split(' ')
  if (parts.length >= 5) {
    const [minute, hour, day, month, dow] = parts
    if (day === '*' && month === '*' && dow === '*') {
      return `Every day at ${hour}:${minute.padStart(2, '0')}`
    }
    if (day === '*' && month === '*' && dow !== '*') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      return `Every ${days[parseInt(dow)] || dow} at ${hour}:${minute.padStart(2, '0')}`
    }
  }

  return cron
}

function formatNextRun(nextRun: string | null): string {
  if (!nextRun) return 'Not scheduled'

  const next = new Date(nextRun)
  const now = new Date()
  const diffMs = next.getTime() - now.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  if (diffHours < 0) return 'Overdue'
  if (diffHours < 1) return `In ${Math.round(diffMs / (1000 * 60))} minutes`
  if (diffHours < 24) return `In ${Math.round(diffHours)} hours`
  if (diffDays < 7) return `In ${Math.round(diffDays)} days`

  return next.toLocaleDateString()
}

function ScheduleCard({
  schedule,
  onPause,
  onResume,
  onTrigger,
  onEdit,
  onDelete,
  onViewHistory,
}: {
  schedule: Schedule
  onPause: (id: string) => void
  onResume: (id: string) => void
  onTrigger: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onViewHistory: (id: string) => void
}) {
  const isActive = schedule.status === 'active'
  const isPaused = schedule.status === 'paused'
  const lastRun = schedule.run_history[schedule.run_history.length - 1]
  const lastRunSuccess = lastRun?.status === 'completed' || lastRun?.status === 'started'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              isActive ? 'bg-green-500 animate-pulse' : isPaused ? 'bg-yellow-500' : 'bg-gray-400'
            }`}
          />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
              {schedule.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatCron(schedule.cron_expression, schedule.schedule_type)}
            </p>
          </div>
        </div>
        <span
          className={`px-2 py-1 text-xs rounded-full capitalize ${
            isActive
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : isPaused
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
          }`}
        >
          {schedule.status}
        </span>
      </div>

      {/* Description */}
      {schedule.description && (
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          {schedule.description}
        </p>
      )}

      {/* Schedule Info */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <CalendarClock className="w-4 h-4" />
            Next Run
          </div>
          <div className="font-semibold text-gray-900 dark:text-white">
            {formatNextRun(schedule.next_run)}
          </div>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            <History className="w-4 h-4" />
            Last Run
          </div>
          <div className="flex items-center gap-2">
            {lastRun ? (
              <>
                {lastRunSuccess ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {lastRun.documents_found} docs
                </span>
              </>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">Never run</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4 pb-4 border-b dark:border-gray-700">
        <div className="flex items-center gap-1">
          <Timer className="w-4 h-4" />
          <span>{schedule.run_count} runs</span>
        </div>
        {schedule.template_id && (
          <div className="flex items-center gap-1">
            <Settings className="w-4 h-4" />
            <span>Template: {schedule.template_id}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>{schedule.timezone}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {isActive ? (
          <button
            onClick={() => onPause(schedule.id)}
            className="flex items-center gap-2 px-3 py-2 text-yellow-700 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-300 rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors"
          >
            <Pause className="w-4 h-4" />
            Pause
          </button>
        ) : (
          <button
            onClick={() => onResume(schedule.id)}
            className="flex items-center gap-2 px-3 py-2 text-green-700 bg-green-100 dark:bg-green-900 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
          >
            <Play className="w-4 h-4" />
            Resume
          </button>
        )}
        <button
          onClick={() => onTrigger(schedule.id)}
          className="flex items-center gap-2 px-3 py-2 text-blue-700 bg-blue-100 dark:bg-blue-900 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
        >
          <Zap className="w-4 h-4" />
          Run Now
        </button>
        <button
          onClick={() => onViewHistory(schedule.id)}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="View History"
        >
          <History className="w-5 h-5" />
        </button>
        <button
          onClick={() => onEdit(schedule.id)}
          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Edit"
        >
          <Edit className="w-5 h-5" />
        </button>
        <button
          onClick={() => onDelete(schedule.id)}
          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

function HistoryModal({
  schedule,
  history,
  onClose,
}: {
  schedule: Schedule | null
  history: { history: ScheduleRunRecord[]; success_rate: number } | null
  onClose: () => void
}) {
  if (!schedule || !history) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Run History: {schedule.name}
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Success Rate: {history.success_rate.toFixed(1)}%
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <span className="text-2xl">&times;</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          {history.history.length > 0 ? (
            <div className="space-y-4">
              {history.history.map((run) => (
                <div
                  key={run.run_id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    {run.status === 'completed' || run.status === 'started' ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : run.status === 'failed' ? (
                      <XCircle className="w-6 h-6 text-red-500" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-yellow-500" />
                    )}
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {new Date(run.started_at).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Crawl ID: {run.crawl_id}
                      </div>
                      {run.error_message && (
                        <div className="text-sm text-red-500">{run.error_message}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {run.documents_found} docs
                    </div>
                    {run.duration_seconds && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {Math.round(run.duration_seconds)}s
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No run history yet
            </div>
          )}
        </div>

        <div className="p-6 border-t dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateScheduleModal({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (data: any) => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    schedule_type: 'daily',
    cron_expression: '0 2 * * *',
    timezone: 'America/Port_of_Spain',
    template_id: '',
  })

  const schedulePresets: { [key: string]: string } = {
    daily: '0 2 * * *',
    weekly: '0 2 * * 5',
    monthly: '0 2 1 * *',
  }

  const handleTypeChange = (type: string) => {
    setFormData({
      ...formData,
      schedule_type: type,
      cron_expression: schedulePresets[type] || formData.cron_expression,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onCreate(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full">
        <div className="p-6 border-b dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Create Schedule
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <span className="text-2xl">&times;</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Schedule Name
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

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Frequency
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['daily', 'weekly', 'monthly'].map((type) => (
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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cron Expression
            </label>
            <input
              type="text"
              value={formData.cron_expression}
              onChange={(e) => setFormData({ ...formData, cron_expression: e.target.value })}
              className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
              placeholder="0 2 * * *"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {formatCron(formData.cron_expression, formData.schedule_type)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Timezone
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="America/Port_of_Spain">America/Port_of_Spain (AST)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="UTC">UTC</option>
              <option value="Europe/London">Europe/London (GMT)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Template ID (Optional)
            </label>
            <input
              type="text"
              value={formData.template_id}
              onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
              className="w-full px-4 py-2 border dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="sea-materials"
            />
          </div>
        </form>

        <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onCreate(formData)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Schedule
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SchedulerPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [stats, setStats] = useState<SchedulerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [historyModal, setHistoryModal] = useState<{
    schedule: Schedule
    history: { history: ScheduleRunRecord[]; success_rate: number }
  } | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const fetchSchedules = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/schedules`)
      const data = await response.json()
      setSchedules(data.schedules || [])
    } catch (error) {
      console.error('Error fetching schedules:', error)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/scheduler/status`)
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }, [])

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchSchedules(), fetchStats()])
      setLoading(false)
    }
    loadData()
  }, [fetchSchedules, fetchStats])

  const handlePause = async (id: string) => {
    try {
      await fetch(`${API_BASE}/schedules/${id}/pause`, { method: 'POST' })
      fetchSchedules()
    } catch (error) {
      console.error('Error pausing schedule:', error)
    }
  }

  const handleResume = async (id: string) => {
    try {
      await fetch(`${API_BASE}/schedules/${id}/resume`, { method: 'POST' })
      fetchSchedules()
    } catch (error) {
      console.error('Error resuming schedule:', error)
    }
  }

  const handleTrigger = async (id: string) => {
    try {
      await fetch(`${API_BASE}/schedules/${id}/trigger`, { method: 'POST' })
      alert('Schedule triggered! Crawl will start shortly.')
      fetchSchedules()
    } catch (error) {
      console.error('Error triggering schedule:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return

    try {
      await fetch(`${API_BASE}/schedules/${id}`, { method: 'DELETE' })
      fetchSchedules()
    } catch (error) {
      console.error('Error deleting schedule:', error)
    }
  }

  const handleViewHistory = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/schedules/${id}/history`)
      const data = await response.json()
      const schedule = schedules.find((s) => s.id === id)
      if (schedule) {
        setHistoryModal({ schedule, history: data })
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    }
  }

  const handleCreate = async (data: any) => {
    try {
      await fetch(`${API_BASE}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          crawl_config: data.template_id ? null : { targets: [], keywords: [] },
        }),
      })
      setShowCreateModal(false)
      fetchSchedules()
    } catch (error) {
      console.error('Error creating schedule:', error)
    }
  }

  const activeSchedules = schedules.filter((s) => s.status === 'active')
  const pausedSchedules = schedules.filter((s) => s.status === 'paused')

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Automation"
        title="Scheduled Crawls"
        description="Automate recurring crawls, monitor run history, and keep document pipelines fresh."
        actions={
          <button onClick={() => setShowCreateModal(true)} className="gc-button">
            <Plus className="w-5 h-5" />
            New Schedule
          </button>
        }
      />

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="gc-panel p-4">
            <div className="text-sm text-[var(--gc-muted)]">Scheduler Status</div>
            <div className="flex items-center gap-2 mt-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  stats.running ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}
              />
              <span className="font-semibold text-[var(--gc-ink)]">
                {stats.running ? 'Running' : 'Stopped'}
              </span>
            </div>
          </div>
          <div className="gc-panel p-4">
            <div className="text-sm text-[var(--gc-muted)]">Active Schedules</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.active_count}
            </div>
          </div>
          <div className="gc-panel p-4">
            <div className="text-sm text-[var(--gc-muted)]">Paused Schedules</div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats.paused_count}
            </div>
          </div>
          <div className="gc-panel p-4">
            <div className="text-sm text-[var(--gc-muted)]">Total Runs</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.total_runs}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--gc-accent)]"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {activeSchedules.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-[var(--gc-ink)] font-display mb-4">
                Active Schedules ({activeSchedules.length})
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {activeSchedules.map((schedule) => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    onPause={handlePause}
                    onResume={handleResume}
                    onTrigger={handleTrigger}
                    onEdit={(id) => alert(`Edit schedule ${id}`)}
                    onDelete={handleDelete}
                    onViewHistory={handleViewHistory}
                  />
                ))}
              </div>
            </section>
          )}

          {pausedSchedules.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-[var(--gc-ink)] font-display mb-4">
                Paused Schedules ({pausedSchedules.length})
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {pausedSchedules.map((schedule) => (
                  <ScheduleCard
                    key={schedule.id}
                    schedule={schedule}
                    onPause={handlePause}
                    onResume={handleResume}
                    onTrigger={handleTrigger}
                    onEdit={(id) => alert(`Edit schedule ${id}`)}
                    onDelete={handleDelete}
                    onViewHistory={handleViewHistory}
                  />
                ))}
              </div>
            </section>
          )}

          {schedules.length === 0 && (
            <div className="gc-panel p-10 text-center">
              <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
                No scheduled crawls yet
              </p>
              <button onClick={() => setShowCreateModal(true)} className="gc-button">
                <Plus className="w-5 h-5" />
                Create Your First Schedule
              </button>
            </div>
          )}
        </div>
      )}

      {historyModal && (
        <HistoryModal
          schedule={historyModal.schedule}
          history={historyModal.history}
          onClose={() => setHistoryModal(null)}
        />
      )}

      {showCreateModal && (
        <CreateScheduleModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
