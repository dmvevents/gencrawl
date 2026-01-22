'use client'

import { useEffect, useState } from 'react'
import { Clock, Check, AlertCircle, Loader2 } from 'lucide-react'
import { API_BASE } from '@/lib/api/config'

interface CrawlerState {
  state: 'queued' | 'running' | 'extracting' | 'processing' | 'completed' | 'failed'
  progress: {
    crawled: number
    total: number
  }
  documents_found: number
  average_quality: number
  started_at?: string
  completed_at?: string
}

interface CrawlerStateFlowProps {
  crawlId: string
}

const STATES = [
  { id: 'queued', label: 'Queued', icon: Clock },
  { id: 'running', label: 'Crawling', icon: Loader2 },
  { id: 'extracting', label: 'Extracting', icon: Loader2 },
  { id: 'processing', label: 'Processing', icon: Loader2 },
  { id: 'completed', label: 'Completed', icon: Check },
]

export function CrawlerStateFlow({ crawlId }: CrawlerStateFlowProps) {
  const [state, setState] = useState<CrawlerState | null>(null)
  const [estimatedTimes, setEstimatedTimes] = useState<Record<string, number>>({
    queued: 5,
    running: 120,
    extracting: 30,
    processing: 15,
  })

  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch(`${API_BASE}/crawl/${crawlId}/status`)
        const data = await res.json()
        setState({
          state: data.status,
          progress: data.progress || { crawled: 0, total: 100 },
          documents_found: data.documents_found || 0,
          average_quality: data.average_quality || 0,
          started_at: data.started_at,
          completed_at: data.completed_at,
        })
      } catch (err) {
        console.error('Failed to fetch state:', err)
      }
    }

    fetchState()
    const interval = setInterval(fetchState, 2000)
    return () => clearInterval(interval)
  }, [crawlId])

  if (!state) {
    return (
      <div className="gc-panel p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-[color:var(--gc-border)]/60 rounded w-1/4"></div>
          <div className="flex gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex-1 h-24 bg-[color:var(--gc-border)]/60 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const currentStateIndex = STATES.findIndex(s => s.id === state.state)
  const isCompleted = state.state === 'completed'
  const isFailed = state.state === 'failed'

  const getElapsedTime = () => {
    if (!state.started_at) return null
    const start = new Date(state.started_at).getTime()
    const end = state.completed_at ? new Date(state.completed_at).getTime() : Date.now()
    const seconds = Math.floor((end - start) / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m ${seconds % 60}s`
  }

  return (
    <div className="gc-panel p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-[var(--gc-ink)] font-display">Crawler State</h3>
        {state.started_at && (
          <div className="flex items-center gap-4 text-sm text-[var(--gc-muted)]">
            <span className="flex items-center gap-1">
              <Clock size={16} />
              {getElapsedTime()}
            </span>
          </div>
        )}
      </div>

      {/* State Flow */}
      <div className="relative">
        <div className="flex items-center justify-between mb-8">
          {STATES.map((stateItem, index) => {
            const isActive = index === currentStateIndex
            const isComplete = index < currentStateIndex || isCompleted
            const Icon = stateItem.icon

            return (
              <div key={stateItem.id} className="flex-1 relative">
                {/* Connection Line */}
                {index < STATES.length - 1 && (
                  <div
                    className={`absolute top-6 left-1/2 w-full h-0.5 transition-colors ${
                      isComplete ? 'bg-emerald-500' : 'bg-[var(--gc-border)]'
                    }`}
                    style={{ zIndex: 0 }}
                  />
                )}

                {/* State Circle */}
                <div className="relative flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isFailed && isActive
                        ? 'bg-rose-500/10 border-2 border-rose-500 text-rose-600'
                        : isActive
                        ? 'bg-[var(--gc-accent-soft)] border-2 border-[var(--gc-accent)] text-[var(--gc-accent-strong)] animate-pulse'
                        : isComplete
                        ? 'bg-emerald-500/10 border-2 border-emerald-500 text-emerald-600'
                        : 'bg-[var(--gc-surface-muted)] border-2 border-[var(--gc-border)] text-[var(--gc-muted)]'
                    }`}
                    style={{ zIndex: 1 }}
                  >
                    {isFailed && isActive ? (
                      <AlertCircle size={24} />
                    ) : isComplete ? (
                      <Check size={24} />
                    ) : isActive ? (
                      <Icon size={24} className="animate-spin" />
                    ) : (
                      <Icon size={24} />
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={`mt-2 text-sm font-medium ${
                      isActive || isComplete ? 'text-[var(--gc-ink)]' : 'text-[var(--gc-muted)]'
                    }`}
                  >
                    {stateItem.label}
                  </span>

                  {/* Estimated Time */}
                  {isActive && !isCompleted && !isFailed && estimatedTimes[stateItem.id] && (
                    <span className="text-xs text-[var(--gc-muted)] mt-1">
                      ~{estimatedTimes[stateItem.id]}s
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Progress Bar */}
        {state.state === 'running' && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-[var(--gc-muted)] mb-2">
              <span>Progress</span>
              <span>
                {state.progress.crawled}/{state.progress.total} pages
              </span>
            </div>
            <div className="w-full bg-[var(--gc-surface-muted)] rounded-full h-2">
              <div
                className="bg-[var(--gc-accent)] h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${state.progress.total > 0 ? (state.progress.crawled / state.progress.total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="gc-panel-muted p-4">
            <div className="text-sm text-[var(--gc-muted)] mb-1">Documents Found</div>
            <div className="text-2xl font-semibold text-[var(--gc-ink)]">
              {state.documents_found}
            </div>
          </div>
          <div className="gc-panel-muted p-4">
            <div className="text-sm text-[var(--gc-muted)] mb-1">Avg Quality</div>
            <div className="text-2xl font-semibold text-[var(--gc-ink)]">
              {state.average_quality.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Failed State Message */}
      {isFailed && (
        <div className="mt-4 p-4 bg-rose-500/10 border border-rose-200 rounded-lg">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertCircle size={20} />
            <span className="font-medium">Crawl failed. Check logs for details.</span>
          </div>
        </div>
      )}
    </div>
  )
}
