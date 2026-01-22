'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X,
  Play,
  Trash2,
  Download,
  Copy,
  CheckCircle,
  Clock,
  FileText,
  AlertCircle,
  Loader2,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Globe,
  Calendar,
  Activity,
  Code,
  List,
  BarChart3,
  ScrollText
} from 'lucide-react'
import { crawlsApi, ingestApi, CrawlFullData, ApiError, IngestStatusResponse } from '@/lib/api/client'

interface JobDetailModalProps {
  crawlId: string
  onClose: () => void
  onRerun: (crawlId: string) => void
  onDelete: (crawlId: string) => void
}

type TabType = 'overview' | 'states' | 'metrics' | 'logs' | 'config'

const TAB_CONFIG = [
  { id: 'overview' as TabType, label: 'Overview', icon: Activity },
  { id: 'states' as TabType, label: 'State History', icon: List },
  { id: 'metrics' as TabType, label: 'Metrics', icon: BarChart3 },
  { id: 'logs' as TabType, label: 'Event Log', icon: ScrollText },
  { id: 'config' as TabType, label: 'Configuration', icon: Code },
]

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-500',
  running: 'bg-blue-500',
  failed: 'bg-red-500',
  paused: 'bg-yellow-500',
  cancelled: 'bg-gray-500',
  queued: 'bg-purple-500',
  initializing: 'bg-blue-400',
  crawling: 'bg-blue-500',
  extracting: 'bg-indigo-500',
  processing: 'bg-violet-500',
}

function formatDuration(seconds: number | undefined | null): string {
  if (!seconds) return '-'
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return `${minutes}m ${remainingSeconds.toFixed(0)}s`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

function formatDateTime(dateString: string | undefined | null): string {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return dateString
  }
}

function formatTime(dateString: string | undefined | null): string {
  if (!dateString) return '-'
  try {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  } catch {
    return dateString
  }
}

export function JobDetailModal({ crawlId, onClose, onRerun, onDelete }: JobDetailModalProps) {
  const [data, setData] = useState<CrawlFullData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [copied, setCopied] = useState(false)
  const [rerunning, setRerunning] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [ingestStatus, setIngestStatus] = useState<IngestStatusResponse | null>(null)
  const [ingesting, setIngesting] = useState(false)
  const [ingestError, setIngestError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const result = await crawlsApi.getById(crawlId)
      setData(result)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to fetch crawl details')
      }
    } finally {
      setLoading(false)
    }
  }, [crawlId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const fetchIngestStatus = useCallback(async () => {
    try {
      const status = await ingestApi.status(crawlId)
      setIngestStatus(status)
      setIngestError(null)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setIngestStatus(null)
        setIngestError(null)
        return
      }
      setIngestError('Failed to load ingestion status')
    }
  }, [crawlId])

  useEffect(() => {
    fetchIngestStatus()
  }, [fetchIngestStatus])

  // Auto-refresh for active jobs
  useEffect(() => {
    if (!data || !['running', 'queued', 'initializing', 'crawling', 'extracting', 'processing'].includes(data.status)) {
      return
    }

    const interval = setInterval(fetchData, 3000)
    return () => clearInterval(interval)
  }, [data, fetchData])

  const handleCopyId = async () => {
    await navigator.clipboard.writeText(crawlId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRerun = async () => {
    setRerunning(true)
    try {
      const result = await crawlsApi.rerun(crawlId)
      onRerun(result.new_crawl_id)
      onClose()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to re-run crawl')
      }
    } finally {
      setRerunning(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await crawlsApi.delete(crawlId)
      onDelete(crawlId)
      onClose()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to delete crawl')
      }
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleDownload = async () => {
    try {
      const result = await crawlsApi.download(crawlId, 'json')
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `crawl-${crawlId}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError('Failed to download results')
    }
  }

  const handleIngest = async () => {
    setIngesting(true)
    try {
      await ingestApi.run(crawlId, false)
      await fetchIngestStatus()
    } catch (err) {
      if (err instanceof ApiError) {
        setIngestError(err.message)
      } else {
        setIngestError('Failed to ingest crawl results')
      }
    } finally {
      setIngesting(false)
    }
  }

  const handleDownloadIngested = async () => {
    try {
      const result = await ingestApi.download(crawlId, 'jsonl')
      const blob = new Blob([result.content], { type: 'application/jsonl' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `crawl-${crawlId}-ingested.jsonl`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setIngestError('Failed to download ingested results')
    }
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const color = STATUS_COLORS[status] || 'bg-gray-500'
    const isActive = ['running', 'crawling', 'extracting', 'processing'].includes(status)

    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-medium ${color}`}>
        {isActive && <Loader2 className="w-4 h-4 animate-spin" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const StatCard = ({ icon: Icon, label, value, subValue }: {
    icon: typeof Clock
    label: string
    value: string | number
    subValue?: string
  }) => (
    <div className="gc-panel-muted p-4">
      <div className="flex items-center gap-2 text-[var(--gc-muted)] mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-semibold text-[var(--gc-ink)]">{value}</div>
      {subValue && (
        <div className="text-sm text-[var(--gc-muted)] mt-0.5">{subValue}</div>
      )}
    </div>
  )

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute inset-4 md:inset-8 lg:inset-12 bg-[var(--gc-surface)] border border-[var(--gc-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--gc-border)]">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-[var(--gc-ink)] font-display">
              Crawl Details
            </h2>
            <div className="flex items-center gap-2">
              <code className="text-sm text-[var(--gc-muted)] font-mono bg-[var(--gc-surface-muted)] px-2 py-0.5 rounded">
                {crawlId.substring(0, 8)}...
              </code>
              <button
                onClick={handleCopyId}
                className="p-1 text-[var(--gc-muted)] hover:text-[var(--gc-ink)] rounded"
                title="Copy full ID"
              >
                {copied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {data && <StatusBadge status={data.status} />}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="gc-icon-button"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="gc-icon-button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="px-6 py-3 bg-rose-500/10 border-b border-rose-200">
            <div className="flex items-center gap-2 text-rose-700">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && !data && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-[var(--gc-accent)] animate-spin" />
              <p className="text-[var(--gc-muted)]">Loading crawl details...</p>
            </div>
          </div>
        )}

        {/* Content */}
        {data && (
          <>
            {/* Tabs */}
            <div className="px-6 border-b border-[var(--gc-border)]">
              <nav className="flex gap-1 -mb-px">
                {TAB_CONFIG.map((tab) => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-[var(--gc-accent)] text-[var(--gc-accent-strong)]'
                          : 'border-transparent text-[var(--gc-muted)] hover:text-[var(--gc-ink)] hover:border-[var(--gc-border)]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </nav>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Query */}
                  {data.query && (
                    <div className="gc-panel-muted border border-[color:var(--gc-accent)]/30 rounded-xl p-4">
                      <div className="text-xs font-medium text-[var(--gc-accent-strong)] uppercase tracking-wider mb-2">
                        Original Query
                      </div>
                      <p className="text-lg text-[var(--gc-ink)]">{data.query}</p>
                    </div>
                  )}

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                      icon={Clock}
                      label="Duration"
                      value={formatDuration(data.duration_seconds)}
                    />
                    <StatCard
                      icon={Globe}
                      label="URLs Crawled"
                      value={data.urls_crawled}
                      subValue={`${data.urls_failed} failed`}
                    />
                    <StatCard
                      icon={FileText}
                      label="Documents"
                      value={data.documents_found}
                    />
                    <StatCard
                      icon={Activity}
                      label="Success Rate"
                      value={`${data.success_rate.toFixed(1)}%`}
                    />
                  </div>

                  {/* Timing */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="gc-panel-muted p-4">
                      <div className="flex items-center gap-2 text-[var(--gc-muted)] mb-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase tracking-wider">Started</span>
                      </div>
                      <div className="text-[var(--gc-ink)]">{formatDateTime(data.started_at)}</div>
                    </div>
                    <div className="gc-panel-muted p-4">
                      <div className="flex items-center gap-2 text-[var(--gc-muted)] mb-2">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase tracking-wider">Completed</span>
                      </div>
                      <div className="text-[var(--gc-ink)]">{formatDateTime(data.completed_at)}</div>
                    </div>
                  </div>

                  {/* Targets */}
                  {data.targets && data.targets.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-[var(--gc-muted)] uppercase tracking-wider mb-3">
                        Target Sites ({data.targets.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {data.targets.map((target, i) => (
                          <a
                            key={i}
                            href={target}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-[var(--gc-border)] text-[var(--gc-ink)] hover:border-[var(--gc-accent)] transition-colors"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            {new URL(target).hostname}
                            <ExternalLink className="w-3 h-3 opacity-50" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ingestion */}
                  <div className="gc-panel-muted p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs font-medium text-[var(--gc-muted)] uppercase tracking-wider">
                        Ingestion Pipeline
                      </div>
                      {ingestStatus && (
                        <span className="text-xs text-[var(--gc-muted)]">
                          {ingestStatus.counts.ingested} records
                        </span>
                      )}
                    </div>

                    {ingestError && (
                      <div className="mb-3 text-sm text-rose-600">
                        {ingestError}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={handleIngest}
                        disabled={ingesting}
                        className="gc-button"
                      >
                        {ingesting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {ingesting ? 'Ingesting...' : 'Ingest Results'}
                      </button>
                      {ingestStatus && (
                        <button
                          onClick={handleDownloadIngested}
                          className="gc-button-secondary text-sm"
                        >
                          Download JSONL
                        </button>
                      )}
                    </div>

                    {ingestStatus && (
                      <div className="mt-3 text-xs text-[var(--gc-muted)]">
                        Structured path: {ingestStatus.output_structure || 'region/program/level/subject/year/document_type/'}
                      </div>
                    )}
                  </div>

                  {/* Error message */}
                  {data.error_message && (
                    <div className="bg-rose-500/10 border border-rose-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-rose-600 mb-2">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-medium">Error ({data.error_count} total)</span>
                      </div>
                      <pre className="text-sm text-rose-700 whitespace-pre-wrap">
                        {data.error_message}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'states' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[var(--gc-ink)] font-display">
                    State Transition History
                  </h3>

                  {data.state_history && data.state_history.length > 0 ? (
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-[var(--gc-border)]" />

                      <div className="space-y-4">
                        {data.state_history.map((transition, index) => {
                          const fromColor = STATUS_COLORS[transition.from_state?.toLowerCase()] || 'bg-gray-500'
                          const toColor = STATUS_COLORS[transition.to_state?.toLowerCase()] || 'bg-gray-500'

                          return (
                            <div key={index} className="relative flex items-start gap-4 pl-4">
                              {/* Timeline dot */}
                              <div className={`absolute left-2 w-4 h-4 rounded-full border-2 border-[var(--gc-surface)] ${toColor} -translate-x-1/2`} />

                              <div className="flex-1 ml-6 gc-panel-muted p-4">
                                <div className="flex items-center gap-3 mb-2">
                                  <span className={`px-2 py-0.5 rounded text-xs text-white ${fromColor}`}>
                                    {transition.from_state || 'START'}
                                  </span>
                                  <ChevronRight className="w-4 h-4 text-[var(--gc-muted)]" />
                                  <span className={`px-2 py-0.5 rounded text-xs text-white ${toColor}`}>
                                    {transition.to_state}
                                  </span>
                                  {transition.duration_seconds && (
                                    <span className="text-xs text-[var(--gc-muted)] ml-auto">
                                      +{formatDuration(transition.duration_seconds)}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-[var(--gc-muted)]">
                                  {formatTime(transition.timestamp)}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[var(--gc-muted)]">
                      No state history available
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'metrics' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-[var(--gc-ink)] font-display">
                    Performance Metrics
                  </h3>

                  {data.metrics && Object.keys(data.metrics).length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(data.metrics).map(([key, value]) => (
                        <div key={key} className="gc-panel-muted p-4">
                          <div className="text-xs font-medium text-[var(--gc-muted)] uppercase tracking-wider mb-1">
                            {key.replace(/_/g, ' ')}
                          </div>
                          <div className="text-xl font-semibold text-[var(--gc-ink)]">
                            {typeof value === 'number'
                              ? value % 1 === 0
                                ? value.toLocaleString()
                                : value.toFixed(2)
                              : String(value) || '-'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[var(--gc-muted)]">
                      No metrics available
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'logs' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[var(--gc-ink)] font-display">
                      Event Log ({data.events?.length || 0} events)
                    </h3>
                  </div>

                  {data.events && data.events.length > 0 ? (
                    <div className="bg-slate-900 rounded-lg p-4 max-h-[400px] overflow-auto font-mono text-sm text-slate-100">
                      {data.events.slice(-100).map((event, index) => {
                        const eventType = event.event_type || 'unknown'
                        const typeColor =
                          eventType.includes('error') ? 'text-red-400' :
                          eventType.includes('complete') ? 'text-green-400' :
                          eventType.includes('start') ? 'text-blue-400' :
                          eventType.includes('state') ? 'text-yellow-400' :
                          'text-gray-400'

                        return (
                          <div key={index} className="flex gap-4 py-1 border-b border-slate-800 last:border-0">
                            <span className="text-slate-400 shrink-0">
                              {formatTime(event.timestamp)}
                            </span>
                            <span className={`shrink-0 ${typeColor}`}>
                              [{eventType}]
                            </span>
                            <span className="text-slate-200 truncate">
                              {event.data?.url || event.data?.to_state || JSON.stringify(event.data).substring(0, 80)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[var(--gc-muted)]">
                      No events available
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'config' && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[var(--gc-ink)] font-display">
                    LLM-Generated Configuration
                  </h3>

                  {data.config && Object.keys(data.config).length > 0 ? (
                    <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-auto max-h-[500px] text-sm">
                      {JSON.stringify(data.config, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-center py-8 text-[var(--gc-muted)]">
                      No configuration available
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--gc-border)] bg-[var(--gc-surface-muted)]">
              <div className="flex items-center gap-3">
                {showDeleteConfirm ? (
                  <>
                    <span className="text-sm text-rose-600">Delete this crawl?</span>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-3 py-1.5 bg-rose-600 text-white text-sm rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors"
                    >
                      {deleting ? 'Deleting...' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 text-[var(--gc-muted)] text-sm hover:text-[var(--gc-ink)] transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownload}
                  className="gc-button-secondary"
                >
                  <Download className="w-4 h-4" />
                  Download Results
                </button>

                <button
                  onClick={handleRerun}
                  disabled={rerunning || !data.config}
                  className="gc-button"
                >
                  {rerunning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Re-run Crawl
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
