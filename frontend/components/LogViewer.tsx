'use client'

import { useEffect, useState, useRef } from 'react'
import { Search, Download, Filter, X, AlertCircle, Loader2 } from 'lucide-react'
import { logsApi, LogEntry as ApiLogEntry, ApiError } from '@/lib/api/client'

interface LogEntry extends ApiLogEntry {}

interface LogViewerProps {
  crawlId?: string
  autoScroll?: boolean
}

const EVENT_COLORS: Record<string, string> = {
  crawl_start: 'bg-sky-500/10 border-sky-200 text-sky-800',
  page_crawled: 'bg-emerald-500/10 border-emerald-200 text-emerald-800',
  page_failed: 'bg-rose-500/10 border-rose-200 text-rose-800',
  document_found: 'bg-violet-500/10 border-violet-200 text-violet-800',
  extraction: 'bg-amber-500/10 border-amber-200 text-amber-800',
  quality_check: 'bg-cyan-500/10 border-cyan-200 text-cyan-800',
  error: 'bg-rose-500/15 border-rose-300 text-rose-900',
  default: 'bg-slate-500/10 border-slate-200 text-slate-800'
}

export function LogViewer({ crawlId, autoScroll = true }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  const eventTypes = [...new Set(logs.map(log => log.event_type))]

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = crawlId
          ? await logsApi.getByCrawl(crawlId)
          : await logsApi.getAll()

        setLogs(data.logs || [])
        setError(null)
      } catch (err) {
        console.error('Failed to fetch logs:', err)
        if (err instanceof ApiError) {
          setError(err.message)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
    const interval = setInterval(fetchLogs, 2000)
    return () => clearInterval(interval)
  }, [crawlId])

  useEffect(() => {
    let filtered = logs

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(log =>
        JSON.stringify(log).toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply event type filter
    if (selectedTypes.size > 0) {
      filtered = filtered.filter(log => selectedTypes.has(log.event_type))
    }

    setFilteredLogs(filtered)
  }, [logs, searchTerm, selectedTypes])

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [filteredLogs, autoScroll])

  const toggleEventType = (type: string) => {
    const newSelected = new Set(selectedTypes)
    if (newSelected.has(type)) {
      newSelected.delete(type)
    } else {
      newSelected.add(type)
    }
    setSelectedTypes(newSelected)
  }

  const exportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
    const exportName = `logs-${crawlId || 'all'}-${new Date().toISOString()}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportName)
    linkElement.click()
  }

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedTypes(new Set())
  }

  const getEventColor = (eventType: string, level: string) => {
    if (level === 'error') return EVENT_COLORS.error
    if (eventType === 'page_crawled') {
      return logs.find(l => l.event_type === eventType)?.details?.status === 'success'
        ? EVENT_COLORS.page_crawled
        : EVENT_COLORS.page_failed
    }
    return EVENT_COLORS[eventType as keyof typeof EVENT_COLORS] || EVENT_COLORS.default
  }

  return (
    <div className="gc-panel">
      {/* Header */}
      <div className="p-4 border-b border-[var(--gc-border)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--gc-ink)] font-display">
            {crawlId ? `Logs: ${crawlId}` : 'All Logs'}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="gc-icon-button"
              title="Toggle filters"
            >
              <Filter size={18} />
            </button>
            <button
              onClick={exportLogs}
              className="gc-icon-button"
              title="Export logs"
            >
              <Download size={18} />
            </button>
            <span className="text-sm text-[var(--gc-muted)]">
              {filteredLogs.length} events
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--gc-muted)]" size={18} />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface-muted)] text-[var(--gc-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--gc-accent)]"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 p-4 gc-panel-muted">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--gc-ink)]">Filter by event type:</span>
              {selectedTypes.size > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-[var(--gc-accent-strong)] flex items-center gap-1"
                >
                  <X size={14} /> Clear all
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {eventTypes.map(type => (
                <button
                  key={type}
                  onClick={() => toggleEventType(type)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedTypes.has(type)
                      ? 'bg-[var(--gc-accent)] text-white'
                      : 'border border-[var(--gc-border)] text-[var(--gc-muted)] hover:border-[var(--gc-accent)] hover:text-[var(--gc-accent-strong)]'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Logs List */}
      <div className="h-96 overflow-y-auto p-4 space-y-2">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-[var(--gc-muted)]">
            {logs.length === 0 ? 'No logs yet. Start a crawl to see events.' : 'No logs match your filters.'}
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`p-3 border rounded-lg ${getEventColor(log.event_type, log.level)} transition-all hover:shadow-md`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{log.event_type}</span>
                    <span className="text-xs opacity-75">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm opacity-90">
                    {JSON.stringify(log.details, null, 2)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  )
}
