'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw, Loader2 } from 'lucide-react'
import { errorsApi, ErrorEntry as ApiErrorEntry, ApiError } from '@/lib/api/client'

interface ErrorEntry extends ApiErrorEntry {}

interface ErrorTrackerProps {
  crawlId?: string
}

export function ErrorTracker({ crawlId }: ErrorTrackerProps) {
  const [errors, setErrors] = useState<ErrorEntry[]>([])
  const [groupedErrors, setGroupedErrors] = useState<Map<string, ErrorEntry[]>>(new Map())
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [retrying, setRetrying] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const fetchErrors = async () => {
      try {
        const data = crawlId
          ? await errorsApi.getByCrawl(crawlId)
          : await errorsApi.getAll()

        setErrors(data.errors || [])
        setFetchError(null)
      } catch (err) {
        console.error('Failed to fetch errors:', err)
        if (err instanceof ApiError) {
          setFetchError(err.message)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchErrors()
    const interval = setInterval(fetchErrors, 5000)
    return () => clearInterval(interval)
  }, [crawlId])

  useEffect(() => {
    // Group errors by error type
    const grouped = new Map<string, ErrorEntry[]>()
    errors.forEach(error => {
      const key = error.error_type
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(error)
    })
    setGroupedErrors(grouped)
  }, [errors])

  const toggleGroup = (errorType: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(errorType)) {
      newExpanded.delete(errorType)
    } else {
      newExpanded.add(errorType)
    }
    setExpandedGroups(newExpanded)
  }

  const retryFailed = async (errorIds: string[]) => {
    setRetrying(new Set([...retrying, ...errorIds]))
    try {
      await errorsApi.retry(errorIds)
      // Refresh errors after retry
      setTimeout(() => {
        setRetrying(new Set([...retrying].filter(id => !errorIds.includes(id))))
      }, 2000)
    } catch (err) {
      console.error('Failed to retry:', err)
      setRetrying(new Set([...retrying].filter(id => !errorIds.includes(id))))
    }
  }

  const getSeverityColor = (errorType: string) => {
    if (errorType.includes('timeout') || errorType.includes('network')) {
      return 'border-l-amber-400 bg-amber-500/10 text-amber-700'
    }
    if (errorType.includes('parse') || errorType.includes('extraction')) {
      return 'border-l-orange-400 bg-orange-500/10 text-orange-700'
    }
    return 'border-l-rose-400 bg-rose-500/10 text-rose-700'
  }

  const getTotalErrorCount = () => {
    return [...groupedErrors.values()].reduce((sum, group) => sum + group.length, 0)
  }

  return (
    <div className="gc-panel">
      {/* Header */}
      <div className="p-4 border-b border-[var(--gc-border)]">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--gc-ink)] font-display flex items-center gap-2">
            <AlertCircle className="text-rose-500" size={22} />
            Error Tracker
            <span className="text-sm text-[var(--gc-muted)]">
              ({getTotalErrorCount()} total, {groupedErrors.size} types)
            </span>
          </h3>
        </div>
      </div>

      {/* Error Groups */}
      <div className="max-h-96 overflow-y-auto">
        {groupedErrors.size === 0 ? (
          <div className="p-8 text-center text-[var(--gc-muted)]">
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-medium text-[var(--gc-ink)]">No errors detected</p>
              <p className="text-sm">All crawls are running smoothly</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[var(--gc-border)]">
            {[...groupedErrors.entries()].map(([errorType, errorList]) => {
              const isExpanded = expandedGroups.has(errorType)
              const totalCount = errorList.reduce((sum, e) => sum + e.count, 0)
              const errorIds = errorList.map(e => e.id)

              return (
                <div key={errorType} className="border-b border-[var(--gc-border)] last:border-b-0">
                  {/* Group Header */}
                  <div
                    className={`p-4 cursor-pointer border-l-4 transition-colors ${getSeverityColor(errorType)} hover:bg-[var(--gc-surface-muted)]`}
                    onClick={() => toggleGroup(errorType)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          <h4 className="font-semibold text-[var(--gc-ink)]">{errorType}</h4>
                          <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-xs">
                            {totalCount}
                          </span>
                        </div>
                        <p className="text-sm text-[var(--gc-muted)] ml-7">
                          {errorList[0].message}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          retryFailed(errorIds)
                        }}
                        disabled={retrying.has(errorIds[0])}
                        className="ml-4 px-3 py-1 rounded-full border border-[var(--gc-border)] text-xs font-medium text-[var(--gc-ink)] hover:border-[var(--gc-accent)] hover:text-[var(--gc-accent-strong)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <RefreshCw size={14} className={retrying.has(errorIds[0]) ? 'animate-spin' : ''} />
                        Retry All
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="bg-[var(--gc-surface-muted)] p-4 space-y-3">
                      {errorList.map((error) => (
                        <div key={error.id} className="gc-panel-muted p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-sm text-[var(--gc-muted)] mb-1">
                                <span>{new Date(error.timestamp).toLocaleString()}</span>
                                {error.count > 1 && (
                                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-700">
                                    Occurred {error.count}x
                                  </span>
                                )}
                              </div>
                              {error.url && (
                                <a
                                  href={error.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-[var(--gc-accent-strong)] hover:underline"
                                >
                                  {error.url}
                                </a>
                              )}
                            </div>
                            <button
                              onClick={() => retryFailed([error.id])}
                              disabled={retrying.has(error.id)}
                              className="px-2 py-1 text-xs rounded-full border border-[var(--gc-border)] text-[var(--gc-ink)] hover:border-[var(--gc-accent)] hover:text-[var(--gc-accent-strong)] disabled:opacity-50"
                            >
                              Retry
                            </button>
                          </div>

                          <p className="text-sm text-[var(--gc-ink)] mb-2">{error.message}</p>

                          {error.stack_trace && (
                            <details className="mt-2">
                              <summary className="text-xs text-[var(--gc-muted)] cursor-pointer hover:text-[var(--gc-ink)]">
                                View stack trace
                              </summary>
                              <pre className="mt-2 p-2 bg-[var(--gc-surface-muted)] rounded text-xs overflow-x-auto text-[var(--gc-ink)]">
                                {error.stack_trace}
                              </pre>
                            </details>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
