'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  AlertCircle,
  Loader2,
  ExternalLink,
  Filter
} from 'lucide-react'
import { crawlsApi, CrawlSummary, CrawlsListResponse, ApiError } from '@/lib/api/client'

interface CrawlHistoryTableProps {
  onSelectCrawl: (crawlId: string) => void
  onViewDetails?: (crawlId: string) => void
  selectedCrawlId?: string
  autoSelectFirst?: boolean
}

const STATUS_CONFIG: Record<string, { className: string; icon: typeof CheckCircle }> = {
  completed: { className: 'bg-emerald-500/10 text-emerald-700', icon: CheckCircle },
  running: { className: 'bg-[var(--gc-accent-soft)] text-[var(--gc-accent-strong)]', icon: Loader2 },
  failed: { className: 'bg-rose-500/10 text-rose-700', icon: XCircle },
  paused: { className: 'bg-amber-500/10 text-amber-700', icon: Pause },
  cancelled: { className: 'bg-slate-500/10 text-slate-700', icon: AlertCircle },
  queued: { className: 'bg-violet-500/10 text-violet-700', icon: Clock },
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '-'
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return `${minutes}m ${remainingSeconds.toFixed(0)}s`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60))
      return `${diffMins} min ago`
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`
    } else if (diffHours < 48) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  } catch {
    return dateString
  }
}

function truncateText(text: string | null, maxLength: number): string {
  if (!text) return '-'
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function CrawlHistoryTable({
  onSelectCrawl,
  onViewDetails,
  selectedCrawlId,
  autoSelectFirst = true,
}: CrawlHistoryTableProps) {
  const [crawls, setCrawls] = useState<CrawlSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const autoSelectRef = useRef(false)

  // Pagination state
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Sort state
  const [sortBy, setSortBy] = useState('started_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setPage(1) // Reset to first page on search
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchCrawls = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await crawlsApi.list({
        page: page,
        limit: limit,
        sort_by: sortBy,
        sort_order: sortOrder,
        ...(statusFilter && { status: statusFilter }),
        ...(debouncedSearch && { search: debouncedSearch })
      })

      setCrawls(data.crawls)
      setTotalPages(data.total_pages)
      setTotal(data.total)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to fetch crawls')
      }
      console.error('Failed to fetch crawls:', err)
    } finally {
      setLoading(false)
    }
  }, [page, limit, statusFilter, debouncedSearch, sortBy, sortOrder])

  useEffect(() => {
    fetchCrawls()
  }, [fetchCrawls])

  useEffect(() => {
    if (!selectedCrawlId) {
      autoSelectRef.current = false
    }
  }, [selectedCrawlId])

  useEffect(() => {
    if (!autoSelectFirst || selectedCrawlId || loading || crawls.length === 0) {
      return
    }
    if (autoSelectRef.current) {
      return
    }
    onSelectCrawl(crawls[0].crawl_id)
    autoSelectRef.current = true
  }, [autoSelectFirst, selectedCrawlId, loading, crawls, onSelectCrawl])

  // Auto-refresh for active crawls
  useEffect(() => {
    const hasActiveCrawls = crawls.some(c => c.status === 'running' || c.status === 'queued')
    if (!hasActiveCrawls) return

    const interval = setInterval(fetchCrawls, 5000)
    return () => clearInterval(interval)
  }, [crawls, fetchCrawls])

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return null
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    )
  }

  const StatusBadge = ({ status }: { status: string }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.cancelled
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
        <Icon className={`w-3.5 h-3.5 ${status === 'running' ? 'animate-spin' : ''}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const SuccessRateBar = ({ rate }: { rate: number }) => {
    const getColor = () => {
      if (rate >= 90) return 'bg-emerald-500'
      if (rate >= 70) return 'bg-amber-500'
      return 'bg-rose-500'
    }

    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-[var(--gc-surface-muted)] rounded-full overflow-hidden">
          <div
            className={`h-full ${getColor()} transition-all`}
            style={{ width: `${rate}%` }}
          />
        </div>
        <span className="text-xs text-[var(--gc-muted)] w-10">{rate.toFixed(0)}%</span>
      </div>
    )
  }

  return (
    <div className="gc-panel overflow-hidden">
      {/* Header with filters */}
      <div className="p-4 border-b border-[var(--gc-border)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-[var(--gc-ink)] font-display">
              Crawl History
            </h2>
            <span className="px-2 py-0.5 bg-[var(--gc-surface-muted)] text-[var(--gc-muted)] text-xs rounded-full">
              {total} total
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--gc-muted)]" />
              <input
                type="text"
                placeholder="Search queries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 w-64 text-sm rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface-muted)] text-[var(--gc-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--gc-accent)]"
              />
            </div>

            {/* Status filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--gc-muted)]" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="pl-9 pr-8 py-2 text-sm rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface-muted)] text-[var(--gc-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--gc-accent)] appearance-none cursor-pointer"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="running">Running</option>
                <option value="failed">Failed</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Refresh button */}
            <button
              onClick={fetchCrawls}
              disabled={loading}
              className="gc-icon-button"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 border-b border-[var(--gc-border)] bg-rose-500/10">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{error}</span>
            <button
              onClick={fetchCrawls}
              className="ml-auto text-xs font-semibold text-rose-700 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[var(--gc-surface-muted)]">
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-[var(--gc-muted)] uppercase tracking-wider cursor-pointer hover:bg-[var(--gc-surface)]"
                onClick={() => handleSort('status')}
              >
                Status
                <SortIcon field="status" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--gc-muted)] uppercase tracking-wider">
                Query
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-[var(--gc-muted)] uppercase tracking-wider cursor-pointer hover:bg-[var(--gc-surface)]"
                onClick={() => handleSort('started_at')}
              >
                Started
                <SortIcon field="started_at" />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-[var(--gc-muted)] uppercase tracking-wider cursor-pointer hover:bg-[var(--gc-surface)]"
                onClick={() => handleSort('duration')}
              >
                Duration
                <SortIcon field="duration" />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-[var(--gc-muted)] uppercase tracking-wider cursor-pointer hover:bg-[var(--gc-surface)]"
                onClick={() => handleSort('documents')}
              >
                Documents
                <SortIcon field="documents" />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-semibold text-[var(--gc-muted)] uppercase tracking-wider cursor-pointer hover:bg-[var(--gc-surface)]"
                onClick={() => handleSort('success_rate')}
              >
                Quality
                <SortIcon field="success_rate" />
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--gc-muted)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[var(--gc-border)]">
            {loading && crawls.length === 0 ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="px-4 py-4"><div className="h-6 w-24 bg-[color:var(--gc-border)]/60 rounded" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-48 bg-[color:var(--gc-border)]/60 rounded" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-20 bg-[color:var(--gc-border)]/60 rounded" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-16 bg-[color:var(--gc-border)]/60 rounded" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-12 bg-[color:var(--gc-border)]/60 rounded" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-24 bg-[color:var(--gc-border)]/60 rounded" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-8 bg-[color:var(--gc-border)]/60 rounded ml-auto" /></td>
                </tr>
              ))
            ) : crawls.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <FileText className="w-12 h-12 text-[var(--gc-muted)]" />
                    <p className="text-[var(--gc-muted)]">No crawl jobs found</p>
                    {(statusFilter || debouncedSearch) && (
                      <button
                        onClick={() => {
                          setStatusFilter('')
                          setSearchQuery('')
                        }}
                        className="text-[var(--gc-accent-strong)] text-sm hover:underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              crawls.map((crawl) => (
                <tr
                  key={crawl.crawl_id}
                  onClick={() => onSelectCrawl(crawl.crawl_id)}
                  className={`cursor-pointer transition-colors ${
                    selectedCrawlId === crawl.crawl_id
                      ? 'bg-[var(--gc-accent-soft)]'
                      : 'hover:bg-[var(--gc-surface-muted)]'
                  }`}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <StatusBadge status={crawl.status} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-medium text-[var(--gc-ink)]">
                        {truncateText(crawl.query, 60)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--gc-muted)] font-mono">
                          {crawl.crawl_id.substring(0, 8)}...
                        </span>
                        {crawl.targets.length > 0 && (
                          <span className="text-xs text-[var(--gc-muted)]">
                            {crawl.targets.length} target{crawl.targets.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-sm text-[var(--gc-muted)]">
                      {formatDate(crawl.started_at)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-sm text-[var(--gc-muted)]">
                      <Clock className="w-4 h-4 text-[var(--gc-muted)]" />
                      {formatDuration(crawl.duration_seconds)}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-[var(--gc-muted)]" />
                      <span className="text-sm font-medium text-[var(--gc-ink)]">
                        {crawl.documents_found}
                      </span>
                      <span className="text-xs text-[var(--gc-muted)]">
                        / {crawl.urls_crawled} URLs
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <SuccessRateBar rate={crawl.success_rate} />
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onViewDetails) {
                          onViewDetails(crawl.crawl_id)
                        } else {
                          onSelectCrawl(crawl.crawl_id)
                        }
                      }}
                      className="p-1.5 rounded-lg text-[var(--gc-muted)] hover:text-[var(--gc-accent-strong)] hover:bg-[var(--gc-surface-muted)] transition-colors"
                      title="View details"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-[var(--gc-border)] flex items-center justify-between">
          <div className="text-sm text-[var(--gc-muted)]">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} crawls
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 text-[var(--gc-muted)] hover:bg-[var(--gc-surface-muted)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (page <= 3) {
                  pageNum = i + 1
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = page - 2 + i
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                      page === pageNum
                        ? 'bg-[var(--gc-accent)] text-white'
                        : 'text-[var(--gc-muted)] hover:bg-[var(--gc-surface-muted)]'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 text-[var(--gc-muted)] hover:bg-[var(--gc-surface-muted)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
