'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Clock, Play } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { API_BASE } from '@/lib/api/config'
import PageHeader from '@/components/layout/PageHeader'

export default function SimpleDashboard() {
  const [crawls, setCrawls] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    fetchCrawls()
    const interval = setInterval(fetchCrawls, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchCrawls = async () => {
    try {
      const res = await fetch(`${API_BASE}/crawls`)
      const data = await res.json()
      setCrawls(data.crawls || [])
      setError('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = (crawlId: string) => {
    router.push(`/dashboard/jobs/${crawlId}`)
  }

  const handleRerun = async (crawlId: string) => {
    if (!confirm('Re-run this crawl with the same configuration?')) return

    try {
      const res = await fetch(`${API_BASE}/crawl/${crawlId}/rerun`, {
        method: 'POST'
      })
      const data = await res.json()
      alert(`New crawl started! ID: ${data.new_crawl_id}`)
      fetchCrawls()
    } catch (err) {
      alert('Failed to re-run crawl')
    }
  }

  const handleDownload = async (crawlId: string) => {
    try {
      const res = await fetch(`${API_BASE}/crawl/${crawlId}/download?format=jsonl`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `crawl_${crawlId}.jsonl`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Failed to download results')
    }
  }

  const handleDelete = async (crawlId: string) => {
    if (!confirm('Delete this crawl? This cannot be undone.')) return

    try {
      await fetch(`${API_BASE}/crawl/${crawlId}`, {
        method: 'DELETE'
      })
      alert('Crawl deleted successfully')
      fetchCrawls()
    } catch (err) {
      alert('Failed to delete crawl')
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      running: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Play },
      failed: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
      paused: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
    }
    const badge = badges[status as keyof typeof badges] || badges.completed
    const Icon = badge.icon

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${badge.bg} ${badge.text} text-sm font-medium`}>
        <Icon size={14} />
        {status.toUpperCase()}
      </span>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Legacy View"
        title="Simple Dashboard"
        description="A compact readout of completed crawls for quick audits."
      />

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          Error: {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-[var(--gc-accent)] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-[var(--gc-muted)]">Loading crawls...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="gc-panel p-6">
            <h2 className="text-xl font-semibold mb-4 font-display text-[var(--gc-ink)]">
              Summary
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-[var(--gc-muted)]">Total Crawls</p>
                <p className="text-2xl font-bold">{crawls.length}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--gc-muted)]">Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {crawls.filter(c => c.status === 'completed').length}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--gc-muted)]">Total Documents</p>
                <p className="text-2xl font-bold text-[var(--gc-accent)]">
                  {crawls.reduce((sum, c) => sum + (c.documents_found || 0), 0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-[var(--gc-muted)]">Avg Success Rate</p>
                <p className="text-2xl font-bold text-blue-600">
                  {crawls.length > 0 ? Math.round(crawls.reduce((sum, c) => sum + (c.success_rate || 0), 0) / crawls.length) : 0}%
                </p>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-semibold font-display text-[var(--gc-ink)]">
            Crawl History ({crawls.length})
          </h2>

          {crawls.length === 0 ? (
            <div className="gc-panel p-12 text-center">
              <p className="text-[var(--gc-muted)]">No crawls yet. Submit a request to get started.</p>
            </div>
          ) : (
            crawls.map((crawl) => (
              <div key={crawl.crawl_id} className="gc-panel p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-[var(--gc-ink)] mb-2">
                      {crawl.query}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-[var(--gc-muted)]">
                      <span>ID: {crawl.crawl_id.substring(0, 8)}...</span>
                      <span>Started: {new Date(crawl.started_at).toLocaleString()}</span>
                      <span>Duration: {Math.round(crawl.duration_seconds)}s</span>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(crawl.status)}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-[var(--gc-surface-muted)] rounded-lg">
                  <div>
                    <p className="text-xs text-[var(--gc-muted)] mb-1">URLs Crawled</p>
                    <p className="text-lg font-semibold">{crawl.urls_crawled} / {crawl.urls_total}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--gc-muted)] mb-1">Documents Found</p>
                    <p className="text-lg font-semibold text-[var(--gc-accent)]">{crawl.documents_found}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--gc-muted)] mb-1">Success Rate</p>
                    <p className="text-lg font-semibold text-green-600">{crawl.success_rate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--gc-muted)] mb-1">Quality Score</p>
                    <p className="text-lg font-semibold text-blue-600">
                      {crawl.quality_score > 0 ? crawl.quality_score.toFixed(2) : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-medium text-[var(--gc-ink)] mb-2">
                    Target Sources ({crawl.targets.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {crawl.targets.map((target: string, i: number) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-[var(--gc-accent-soft)] text-[var(--gc-accent-strong)] rounded-full text-xs"
                      >
                        {new URL(target).hostname}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleViewDetails(crawl.crawl_id)}
                    className="gc-button-secondary"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleRerun(crawl.crawl_id)}
                    className="gc-button-secondary"
                  >
                    Re-run
                  </button>
                  <button
                    onClick={() => handleDownload(crawl.crawl_id)}
                    className="gc-button-secondary"
                  >
                    Download Results
                  </button>
                  <button
                    onClick={() => handleDelete(crawl.crawl_id)}
                    className="gc-button-secondary"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
