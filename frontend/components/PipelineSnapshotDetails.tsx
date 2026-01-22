'use client'

import { useEffect, useState } from 'react'
import { Activity, Clock, FileText, Globe, AlertCircle, Loader2, History } from 'lucide-react'
import { crawlsApi, ApiError, OverallStats, CrawlSummary } from '@/lib/api/client'

interface PipelineSnapshotDetailsProps {
  refreshKey: number
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

function formatDuration(seconds?: number): string {
  if (!seconds) return '-'
  if (seconds < 60) return `${seconds.toFixed(0)}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

export function PipelineSnapshotDetails({ refreshKey }: PipelineSnapshotDetailsProps) {
  const [stats, setStats] = useState<OverallStats | null>(null)
  const [recent, setRecent] = useState<CrawlSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const [statsData, recentData] = await Promise.all([
          crawlsApi.getOverallStats(),
          crawlsApi.getRecent(5),
        ])
        setStats(statsData)
        setRecent(recentData.crawls || [])
        setError(null)
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError('Failed to load pipeline details')
        }
      } finally {
        setLoading(false)
      }
    }

    setLoading(true)
    fetchDetails()
  }, [refreshKey])

  if (loading) {
    return (
      <div className="gc-panel-muted p-4 flex items-center gap-2 text-sm text-[var(--gc-muted)]">
        <Loader2 size={16} className="animate-spin" />
        Loading pipeline details...
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="gc-panel-muted border-l-4 border-l-rose-400 p-4 text-sm text-rose-700 flex items-center gap-2">
        <AlertCircle size={16} />
        {error || 'No pipeline stats available'}
      </div>
    )
  }

  const summary = [
    { label: 'Total URLs', value: formatNumber(stats.total_urls_crawled), icon: Globe },
    { label: 'Avg Duration', value: formatDuration(stats.average_duration_seconds), icon: Clock },
    { label: 'Docs Found', value: formatNumber(stats.total_documents_found), icon: FileText },
    { label: 'Success Rate', value: `${stats.average_success_rate.toFixed(1)}%`, icon: Activity },
  ]

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        {summary.map((item) => (
          <div key={item.label} className="gc-panel-muted p-3">
            <div className="flex items-center justify-between text-xs text-[var(--gc-muted)]">
              <span className="uppercase tracking-wider">{item.label}</span>
              <item.icon size={14} />
            </div>
            <div className="mt-2 text-lg font-semibold text-[var(--gc-ink)]">{item.value}</div>
          </div>
        ))}
      </div>

      <div className="gc-panel-muted p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--gc-ink)]">
          <History size={16} />
          Recent Crawls
        </div>
        {recent.length === 0 ? (
          <p className="mt-2 text-xs text-[var(--gc-muted)]">No recent crawls yet.</p>
        ) : (
          <div className="mt-3 space-y-2 text-xs text-[var(--gc-muted)]">
            {recent.map((crawl) => (
              <div key={crawl.crawl_id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[var(--gc-ink)] font-medium truncate">
                    {crawl.query || 'Untitled crawl'}
                  </p>
                  <p className="text-[var(--gc-muted)]">
                    {crawl.documents_found} docs · {crawl.status}
                  </p>
                </div>
                <span className="whitespace-nowrap">{crawl.duration_seconds ? formatDuration(crawl.duration_seconds) : '-'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
