'use client'

import { useEffect, useState } from 'react'
import { API_BASE } from '@/lib/api/config'
import type { CrawlsListResponse } from '@/lib/api/client'
import PageHeader from '@/components/layout/PageHeader'

export default function SimpleWorkingDashboard() {
  const [data, setData] = useState<CrawlsListResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/crawls`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { console.error(e); setLoading(false) })
  }, [])

  if (loading) return <div className="py-12 text-[var(--gc-muted)]">Loading...</div>

  const crawls = data?.crawls || []

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Legacy View"
        title="Simple Working Dashboard"
        description="Lightweight readout for validating crawl history."
      />

      <div className="gc-panel p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-[var(--gc-muted)]">Total Crawls</p>
            <p className="text-3xl font-bold">{crawls.length}</p>
          </div>
          <div>
            <p className="text-sm text-[var(--gc-muted)]">Documents</p>
            <p className="text-3xl font-bold text-[var(--gc-accent)]">
              {crawls.reduce((sum, c) => sum + (c.documents_found || 0), 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--gc-muted)]">URLs Crawled</p>
            <p className="text-3xl font-bold text-blue-600">
              {crawls.reduce((sum, c) => sum + (c.urls_crawled || 0), 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-[var(--gc-muted)]">Success Rate</p>
            <p className="text-3xl font-bold text-green-600">
              {crawls.length > 0 ? Math.round(crawls.reduce((sum, c) => sum + (c.success_rate || 0), 0) / crawls.length) : 0}%
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-semibold font-display text-[var(--gc-ink)]">Crawl History</h2>

      {crawls.map(crawl => (
        <div key={crawl.crawl_id} className="gc-panel p-6">
          <h3 className="text-xl font-semibold mb-2 text-[var(--gc-ink)]">{crawl.query}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm text-[var(--gc-muted)]">
            <div>
              <span>URLs:</span>
              <span className="ml-2 font-semibold text-[var(--gc-ink)]">{crawl.urls_crawled}</span>
            </div>
            <div>
              <span>Documents:</span>
              <span className="ml-2 font-semibold text-[var(--gc-ink)]">{crawl.documents_found}</span>
            </div>
            <div>
              <span>Success:</span>
              <span className="ml-2 font-semibold text-green-600">{crawl.success_rate}%</span>
            </div>
            <div>
              <span>Duration:</span>
              <span className="ml-2 font-semibold text-[var(--gc-ink)]">
                {Math.round(crawl.duration_seconds ?? 0)}s
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`${API_BASE}/crawl/${crawl.crawl_id}/download?format=jsonl`}
              className="gc-button-secondary"
              download
            >
              Download
            </a>
            <a href="/dashboard" className="gc-button-secondary">
              View in Main Dashboard
            </a>
          </div>
        </div>
      ))}
    </div>
  )
}
