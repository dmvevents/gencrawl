'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { crawlsApi, CrawlStatus, ApiError } from '@/lib/api/client'

interface CrawlProgressProps {
  crawlId: string
}

export function CrawlProgress({ crawlId }: CrawlProgressProps) {
  const [status, setStatus] = useState<CrawlStatus | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pollInterval, setPollInterval] = useState(2000)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await crawlsApi.getStatus(crawlId)
        setStatus(data)
        setError(null)

        // Adaptive polling: slow down for completed/failed jobs
        if (data.status === 'completed' || data.status === 'failed') {
          setPollInterval(10000)
        } else if (data.status === 'running') {
          setPollInterval(2000)
        }
      } catch (err) {
        console.error('Failed to fetch status:', err)
        if (err instanceof ApiError) {
          setError(err.message)
        }
        // Back off on errors
        setPollInterval(prev => Math.min(prev * 2, 30000))
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, pollInterval)
    return () => clearInterval(interval)
  }, [crawlId, pollInterval])

  if (error) {
    return (
      <div className="gc-panel-muted border-l-4 border-l-rose-400 p-4 mb-4">
        <p className="text-rose-600 text-sm font-medium">{error}</p>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="gc-panel p-6 mb-4">
        <div className="flex items-center gap-2 text-[var(--gc-muted)]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading status...</span>
        </div>
      </div>
    )
  }

  const progress = status.progress || { crawled: 0, total: 100 }
  const percentage = progress.total > 0 ? (progress.crawled / progress.total) * 100 : 0

  return (
    <div className="gc-panel p-6 mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-[var(--gc-ink)]">
          {status.config?.original_query || 'Crawl Job'}
        </h3>
        <span className={`px-3 py-1 rounded text-sm font-medium ${
          status.status === 'completed'
            ? 'bg-emerald-500/10 text-emerald-700'
            : status.status === 'running'
            ? 'bg-[var(--gc-accent-soft)] text-[var(--gc-accent-strong)]'
            : status.status === 'failed'
            ? 'bg-rose-500/10 text-rose-700'
            : 'bg-slate-500/10 text-slate-700'
        }`}>
          {status.status === 'running' && (
            <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
          )}
          {status.status}
        </span>
      </div>

      <div className="w-full bg-[var(--gc-surface-muted)] rounded-full h-4 mb-2 overflow-hidden">
        <div
          className="bg-[var(--gc-accent)] h-4 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between text-sm text-[var(--gc-muted)]">
        <span>
          {progress.crawled}/{progress.total} pages ({Math.round(percentage)}%)
        </span>
        {status.documents_found > 0 && (
          <span>{status.documents_found} documents found</span>
        )}
      </div>
    </div>
  )
}
