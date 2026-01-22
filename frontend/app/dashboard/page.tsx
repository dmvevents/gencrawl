'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CrawlInput } from '@/components/CrawlInput'
import { SystemHealth } from '@/components/SystemHealth'
import { CrawlProgress } from '@/components/CrawlProgress'
import { DocumentStats } from '@/components/DocumentStats'
import { LogViewer } from '@/components/LogViewer'
import { CrawlerStateFlow } from '@/components/CrawlerStateFlow'
import { LiveMetrics } from '@/components/LiveMetrics'
import { DocumentFeed } from '@/components/DocumentFeed'
import { Analytics } from '@/components/Analytics'
import { ErrorTracker } from '@/components/ErrorTracker'
import { CrawlHistoryTable } from '@/components/CrawlHistoryTable'
import { JobDetailModal } from '@/components/JobDetailModal'
import { JobStatsCard } from '@/components/JobStatsCard'
import { PipelineSnapshotDetails } from '@/components/PipelineSnapshotDetails'
import { EmptyState } from '@/components/EmptyState'
import PageHeader from '@/components/layout/PageHeader'
import { BarChart3, History, Terminal, Zap } from 'lucide-react'
import Link from 'next/link'
import { sessionManager } from '@/lib/session/SessionManager'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { showToast } from '@/lib/toast'

type TabType = 'overview' | 'active' | 'history' | 'logs' | 'analytics'
const validTabs: TabType[] = ['overview', 'active', 'history', 'logs', 'analytics']

// Wrapper component to handle searchParams in Suspense
function DashboardWithSearchParams({ initialTab }: { initialTab?: TabType }) {
  const searchParams = useSearchParams()
  const urlTab = searchParams.get('tab')
  const resolvedTab = validTabs.includes(urlTab as TabType)
    ? (urlTab as TabType)
    : initialTab || 'overview'

  return <DashboardContent initialTab={resolvedTab} />
}

export default function Dashboard() {
  return (
    <Suspense fallback={<DashboardContent initialTab="overview" />}>
      <DashboardWithSearchParams />
    </Suspense>
  )
}

function DashboardContent({ initialTab }: { initialTab: TabType }) {
  const searchInputRef = useRef<HTMLTextAreaElement>(null)

  // State with session persistence
  const [activeCrawls, setActiveCrawls] = useState<string[]>(() =>
    sessionManager.getState('activeCrawls', [])
  )
  const [activeTab, setActiveTab] = useState<TabType>(() =>
    validTabs.includes(initialTab)
      ? initialTab
      : (sessionManager.getState('activeTab', 'overview') as TabType)
  )
  const [selectedCrawl, setSelectedCrawl] = useState<string | undefined>()
  const [historyCrawlId, setHistoryCrawlId] = useState<string | null>(null)
  const [detailModalCrawlId, setDetailModalCrawlId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Save state changes to session
  useEffect(() => {
    sessionManager.saveState('activeTab', activeTab)
  }, [activeTab])

  useEffect(() => {
    sessionManager.saveState('activeCrawls', activeCrawls)
  }, [activeCrawls])

  const handleCrawlSubmitted = (crawlId: string) => {
    setActiveCrawls([...activeCrawls, crawlId])
    setSelectedCrawl(crawlId)
    setActiveTab('active')
  }

  const handleHistoryCrawlSelect = useCallback((crawlId: string) => {
    setHistoryCrawlId(crawlId)
  }, [])

  const handleRerun = useCallback((newCrawlId: string) => {
    setActiveCrawls(prev => [...prev, newCrawlId])
    setSelectedCrawl(newCrawlId)
    setActiveTab('active')
    setRefreshKey(prev => prev + 1)
  }, [])

  const handleDelete = useCallback((crawlId: string) => {
    setActiveCrawls(prev => prev.filter(id => id !== crawlId))
    if (selectedCrawl === crawlId) {
      setSelectedCrawl(undefined)
    }
    setRefreshKey(prev => prev + 1)
  }, [selectedCrawl])

  const [pipelineExpanded, setPipelineExpanded] = useState(false)

  const handleStatClick = useCallback((stat: string) => {
    setPipelineExpanded(true)
    if (stat === 'running') {
      setActiveTab('active')
    } else {
      setActiveTab('history')
    }
  }, [])

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onFocusSearch: () => {
      searchInputRef.current?.focus()
      showToast.info('Press Escape to exit search')
    },
    onNewCrawl: () => {
      searchInputRef.current?.focus()
    },
    onCloseModal: () => {
      if (detailModalCrawlId) {
        setDetailModalCrawlId(null)
      }
    },
    onSwitchTab: (index) => {
      const tabIds: TabType[] = ['overview', 'active', 'history', 'logs', 'analytics']
      if (index < tabIds.length) {
        setActiveTab(tabIds[index])
      }
    },
    onRefresh: () => {
      setRefreshKey(prev => prev + 1)
      showToast.info('Refreshing data...')
    },
  })

  // Track activity
  useEffect(() => {
    sessionManager.trackActivity('page_view', { page: 'dashboard', tab: activeTab })
  }, [activeTab])

  const tabs: { id: TabType; label: string; badge?: number; icon?: typeof History; href?: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'active', label: 'Active Crawls', badge: activeCrawls.length, icon: Zap },
    { id: 'history', label: 'History', icon: History },
    { id: 'logs', label: 'Logs', icon: Terminal },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Command Center"
        title="Prompt-driven crawling for research teams"
        description="Convert high-level intent into structured crawl configurations, then monitor progress and extract ingestion-ready documents."
        actions={
          <>
            <Link href="/dashboard/templates" className="gc-button-secondary">
              Templates
            </Link>
            <Link href="/dashboard/scheduler" className="gc-button">
              Schedule Crawl
            </Link>
          </>
        }
      />

      {/* Crawl Input */}
      <CrawlInput ref={searchInputRef} onCrawlSubmitted={handleCrawlSubmitted} />

      <div className="grid gap-6 lg:grid-cols-2 items-stretch">
        <SystemHealth />
        <div className="gc-panel p-6 h-full flex flex-col">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[var(--gc-ink)] font-display">
              Pipeline Snapshot
            </h2>
            <p className="text-sm text-[var(--gc-muted)]">
              Real-time totals across crawl activity and document output.
            </p>
          </div>
          <JobStatsCard key={refreshKey} onStatClick={handleStatClick} />
          <div className="mt-4 flex items-center justify-between text-xs text-[var(--gc-muted)]">
            <span>Click a stat to jump tabs and open pipeline details.</span>
            <button
              type="button"
              onClick={() => setPipelineExpanded((prev) => !prev)}
              className="gc-button-secondary px-3 py-1 text-xs"
            >
              {pipelineExpanded ? 'Hide details' : 'View details'}
            </button>
          </div>
          {pipelineExpanded && (
            <div className="mt-4">
              <PipelineSnapshotDetails refreshKey={refreshKey} />
            </div>
          )}
        </div>
      </div>

      <div className="gc-panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--gc-ink)] font-display">
              Workspace Activity
            </h2>
            <p className="text-sm text-[var(--gc-muted)]">
              Track live crawls, history, logs, and analytics in one workspace.
            </p>
          </div>
          <div className="text-xs text-[var(--gc-muted)]">
            Tip: Use 1-5 keys to switch tabs.
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="mt-5 border-b border-[var(--gc-border)]">
          <nav className="flex gap-3 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const baseClassName = `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors relative whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-[var(--gc-accent)] text-[var(--gc-accent-strong)]'
                  : 'border-transparent text-[var(--gc-muted)] hover:text-[var(--gc-ink)]'
              }`

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={baseClassName}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="ml-2 rounded-full bg-[var(--gc-accent)] px-2 py-0.5 text-xs text-white">
                      {tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="animate-fadeIn mt-6">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Live Metrics */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-[var(--gc-ink)] font-display">
                  Live Metrics
                </h2>
                <LiveMetrics />
              </section>

              {/* Recent Documents */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-[var(--gc-ink)] font-display">
                  Recent Documents
                </h2>
                <DocumentFeed limit={10} />
              </section>

              {/* Document Stats */}
              <section>
                <DocumentStats />
              </section>

              {/* Recent Errors */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-[var(--gc-ink)] font-display">
                  Recent Errors
                </h2>
                <ErrorTracker />
              </section>
            </div>
          )}

          {activeTab === 'active' && (
            <div className="space-y-8">
              {/* Active Crawls Selection */}
              {activeCrawls.length > 1 && (
                <div className="gc-panel-muted p-4">
                  <label className="block text-sm font-medium text-[var(--gc-muted)] mb-2">
                    Select Crawl to Monitor:
                  </label>
                  <select
                    value={selectedCrawl || ''}
                    onChange={(e) => setSelectedCrawl(e.target.value || undefined)}
                    className="w-full rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] px-4 py-2 text-[var(--gc-ink)]"
                  >
                    <option value="">All Crawls</option>
                    {activeCrawls.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Crawler State Flow */}
              {selectedCrawl && (
                <section>
                  <CrawlerStateFlow crawlId={selectedCrawl} />
                </section>
              )}

              {/* Live Metrics for Selected Crawl */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-[var(--gc-ink)] font-display">
                  {selectedCrawl ? 'Crawl Metrics' : 'All Crawls Metrics'}
                </h2>
                <LiveMetrics crawlId={selectedCrawl} />
              </section>

              {/* Active Crawls List */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-[var(--gc-ink)] font-display">
                  Active Crawls ({activeCrawls.length})
                </h2>
                {activeCrawls.length === 0 ? (
                  <EmptyState
                    icon={Zap}
                    title="No active crawls"
                    description="Submit your first natural language crawl request to get started. Try: 'Find all CXC CSEC Mathematics past papers'"
                    action={{
                      label: "Submit First Crawl",
                      onClick: () => searchInputRef.current?.focus()
                    }}
                  />
                ) : (
                  <div className="space-y-4">
                    {activeCrawls.map((crawlId) => (
                      <CrawlProgress key={crawlId} crawlId={crawlId} />
                    ))}
                  </div>
                )}
              </section>

              {/* Document Feed for Selected Crawl */}
              {selectedCrawl && (
                <section>
                  <h2 className="text-xl font-semibold mb-4 text-[var(--gc-ink)] font-display">
                    Documents Found
                  </h2>
                  <DocumentFeed crawlId={selectedCrawl} />
                </section>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-8">
              {/* Crawl Selection for Logs */}
              {activeCrawls.length > 0 && (
                <div className="gc-panel-muted p-4">
                  <label className="block text-sm font-medium text-[var(--gc-muted)] mb-2">
                    Filter by Crawl:
                  </label>
                  <select
                    value={selectedCrawl || ''}
                    onChange={(e) => setSelectedCrawl(e.target.value || undefined)}
                    className="w-full rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] px-4 py-2 text-[var(--gc-ink)]"
                  >
                    <option value="">All Logs</option>
                    {activeCrawls.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Log Viewer */}
              <section>
                <LogViewer crawlId={selectedCrawl} autoScroll={true} />
              </section>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-8">
              {/* Crawl Selection for Analytics */}
              {activeCrawls.length > 0 && (
                <div className="gc-panel-muted p-4">
                  <label className="block text-sm font-medium text-[var(--gc-muted)] mb-2">
                    Filter by Crawl:
                  </label>
                  <select
                    value={selectedCrawl || ''}
                    onChange={(e) => setSelectedCrawl(e.target.value || undefined)}
                    className="w-full rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] px-4 py-2 text-[var(--gc-ink)]"
                  >
                    <option value="">All Crawls</option>
                    {activeCrawls.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Analytics Dashboard */}
              <section>
                <Analytics crawlId={selectedCrawl} />
              </section>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-8">
              {/* Stats Summary */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-[var(--gc-ink)] font-display">
                  Overview
                </h2>
                <JobStatsCard key={refreshKey} onStatClick={handleStatClick} />
              </section>

              {/* Crawl History Table */}
              <section>
                <CrawlHistoryTable
                  key={refreshKey}
                  onSelectCrawl={handleHistoryCrawlSelect}
                  onViewDetails={setDetailModalCrawlId}
                  selectedCrawlId={historyCrawlId || undefined}
                />
              </section>

              {/* Documents for selected crawl */}
              <section>
                <h2 className="text-xl font-semibold mb-4 text-[var(--gc-ink)] font-display">
                  Documents Found
                </h2>
                {historyCrawlId ? (
                  <DocumentFeed crawlId={historyCrawlId} />
                ) : (
                  <EmptyState
                    icon={History}
                    title="Select a crawl to view documents"
                    description="Click a crawl in the history table to load its discovered documents."
                  />
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      {/* Job Detail Modal */}
      {detailModalCrawlId && (
        <JobDetailModal
          crawlId={detailModalCrawlId}
          onClose={() => setDetailModalCrawlId(null)}
          onRerun={handleRerun}
          onDelete={handleDelete}
        />
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
