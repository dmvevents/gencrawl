'use client'

import { useState, useEffect } from 'react'
import {
  Activity,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  TrendingUp,
  Database,
  Globe
} from 'lucide-react'
import { API_BASE } from '@/lib/api/config'

interface OverallStats {
  total_crawls: number
  completed_crawls: number
  failed_crawls: number
  running_crawls: number
  total_urls_crawled: number
  total_documents_found: number
  average_success_rate: number
  average_duration_seconds: number
}

interface JobStatsCardProps {
  onStatClick?: (stat: string) => void
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toString()
}

function formatDuration(seconds: number): string {
  if (!seconds) return '-'
  if (seconds < 60) return `${seconds.toFixed(0)}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

export function JobStatsCard({ onStatClick }: JobStatsCardProps) {
  const [stats, setStats] = useState<OverallStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${API_BASE}/crawls/stats`)
        if (!response.ok) {
          throw new Error('Failed to fetch stats')
        }
        const data = await response.json()
        setStats(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch stats')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    const interval = setInterval(fetchStats, 10000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="gc-panel-muted p-4 animate-pulse">
            <div className="h-3 w-24 rounded bg-[color:var(--gc-border)]/60 mb-3" />
            <div className="h-7 w-16 rounded bg-[color:var(--gc-border)]/80" />
          </div>
        ))}
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="gc-panel-muted p-4">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-medium">Failed to load statistics</span>
        </div>
      </div>
    )
  }

  const successTone =
    stats.average_success_rate >= 90 ? 'success' :
    stats.average_success_rate >= 70 ? 'warning' :
    'danger'

  const statItems = [
    {
      id: 'total',
      label: 'Total Crawls',
      value: stats.total_crawls,
      icon: Database,
      tone: 'info'
    },
    {
      id: 'completed',
      label: 'Completed',
      value: stats.completed_crawls,
      icon: CheckCircle,
      tone: 'success'
    },
    {
      id: 'running',
      label: 'Running',
      value: stats.running_crawls,
      icon: stats.running_crawls > 0 ? Loader2 : Activity,
      tone: 'info',
      animate: stats.running_crawls > 0
    },
    {
      id: 'failed',
      label: 'Failed',
      value: stats.failed_crawls,
      icon: XCircle,
      tone: 'danger'
    },
    {
      id: 'documents',
      label: 'Documents',
      value: formatNumber(stats.total_documents_found),
      icon: FileText,
      tone: 'neutral'
    },
    {
      id: 'urls_crawled',
      label: 'URLs Crawled',
      value: formatNumber(stats.total_urls_crawled),
      icon: Globe,
      tone: 'info'
    },
    {
      id: 'avg_duration',
      label: 'Avg Duration',
      value: formatDuration(stats.average_duration_seconds),
      icon: Clock,
      tone: 'neutral'
    },
    {
      id: 'success_rate',
      label: 'Avg Success',
      value: `${stats.average_success_rate.toFixed(1)}%`,
      icon: TrendingUp,
      tone: successTone,
      valueTone: successTone
    }
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {statItems.map((stat) => {
        const Icon = stat.icon
        const tones: Record<string, { border: string; icon: string; chip: string; value: string }> = {
          info: {
            border: 'border-l-[color:var(--gc-accent)]',
            icon: 'text-[var(--gc-accent-strong)]',
            chip: 'bg-[var(--gc-accent-soft)]',
            value: 'text-[var(--gc-ink)]'
          },
          success: {
            border: 'border-l-emerald-400',
            icon: 'text-emerald-600 dark:text-emerald-400',
            chip: 'bg-emerald-500/10 dark:bg-emerald-500/20',
            value: 'text-emerald-700 dark:text-emerald-300'
          },
          warning: {
            border: 'border-l-amber-400',
            icon: 'text-amber-600 dark:text-amber-400',
            chip: 'bg-amber-500/10 dark:bg-amber-500/20',
            value: 'text-amber-700 dark:text-amber-300'
          },
          danger: {
            border: 'border-l-rose-400',
            icon: 'text-rose-600 dark:text-rose-400',
            chip: 'bg-rose-500/10 dark:bg-rose-500/20',
            value: 'text-rose-700 dark:text-rose-300'
          },
          neutral: {
            border: 'border-l-slate-300',
            icon: 'text-slate-600 dark:text-slate-300',
            chip: 'bg-slate-500/10 dark:bg-slate-500/20',
            value: 'text-[var(--gc-ink)]'
          }
        }

        const tone = tones[stat.tone]
        const valueTone = stat.valueTone ? tones[stat.valueTone].value : tone.value

        return (
          <button
            key={stat.id}
            onClick={() => onStatClick?.(stat.id)}
            className={`gc-panel-muted border-l-4 ${tone.border} p-4 text-left transition-shadow hover:shadow-md`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[var(--gc-muted)] uppercase tracking-wider">
                {stat.label}
              </span>
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${tone.chip}`}>
                <Icon className={`w-4 h-4 ${tone.icon} ${stat.animate ? 'animate-spin' : ''}`} />
              </span>
            </div>
            <div className={`mt-3 text-2xl font-semibold ${valueTone}`}>
              {stat.value}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// Mini version for compact display
export function JobStatsCardMini({ crawlId, onClick }: { crawlId: string; onClick?: () => void }) {
  const [data, setData] = useState<{
    status: string
    duration_seconds?: number
    documents_found: number
    success_rate: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${API_BASE}/crawl/${crawlId}/status`)
        if (response.ok) {
          const result = await response.json()
          setData({
            status: result.current_state || result.status || 'unknown',
            duration_seconds: result.duration_seconds,
            documents_found: result.metrics?.documents_found || 0,
            success_rate: result.metrics?.success_rate || 100
          })
        }
      } catch (err) {
        console.error('Failed to fetch crawl status:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [crawlId])

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 animate-pulse">
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    )
  }

  if (!data) return null

  const statusColor = {
    completed: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    running: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
    failed: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    paused: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
    cancelled: 'text-gray-600 bg-gray-100 dark:bg-gray-700',
  }[data.status] || 'text-gray-600 bg-gray-100 dark:bg-gray-700'

  return (
    <button
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 hover:shadow-md transition-shadow text-left w-full"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}>
            {data.status}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            {crawlId.substring(0, 8)}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatDuration(data.duration_seconds || 0)}
          </span>
          <span className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            {data.documents_found}
          </span>
          <span className={data.success_rate >= 90 ? 'text-green-600' : data.success_rate >= 70 ? 'text-yellow-600' : 'text-red-600'}>
            {data.success_rate.toFixed(0)}%
          </span>
        </div>
      </div>
    </button>
  )
}
