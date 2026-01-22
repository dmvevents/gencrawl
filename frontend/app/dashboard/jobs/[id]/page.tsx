'use client'

/**
 * Simplified Job Detail Page (Fallback)
 * Shows job details without complex dependencies
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download } from 'lucide-react'
import { API_BASE } from '@/lib/api/config'
import PageHeader from '@/components/layout/PageHeader'

export default function SimpleJobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string

  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJob()
  }, [jobId])

  const fetchJob = async () => {
    try {
      const res = await fetch(`${API_BASE}/crawl/${jobId}/full`)
      const data = await res.json()
      setJob(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="animate-spin w-12 h-12 border-4 border-[var(--gc-accent)] border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-[var(--gc-muted)]">Loading job details...</p>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="gc-panel p-10 text-center">
        <h2 className="text-2xl font-bold text-[var(--gc-ink)] mb-2">Job Not Found</h2>
        <p className="text-[var(--gc-muted)] mb-4">Crawl job {jobId} could not be loaded</p>
        <button
          onClick={() => router.push('/dashboard/simple')}
          className="gc-button-secondary"
        >
          Back to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Job Detail"
        title="Crawl Job Details"
        description={`ID: ${jobId}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => router.back()} className="gc-button-secondary">
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              onClick={async () => {
                const res = await fetch(`${API_BASE}/crawl/${jobId}/download?format=jsonl`)
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `crawl_${jobId}.jsonl`
                a.click()
              }}
              className="gc-button"
            >
              <Download size={18} />
              Download Results
            </button>
          </div>
        }
      />

      <div className="gc-panel p-6">
        <h2 className="text-xl font-semibold mb-2 font-display text-[var(--gc-ink)]">Query</h2>
        <p className="text-lg text-[var(--gc-muted)]">{job.query}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="gc-panel p-6">
          <p className="text-sm text-[var(--gc-muted)] mb-1">Status</p>
          <p className="text-2xl font-bold text-green-600 capitalize">{job.status}</p>
        </div>
        <div className="gc-panel p-6">
          <p className="text-sm text-[var(--gc-muted)] mb-1">Duration</p>
          <p className="text-2xl font-bold">{Math.round(job.duration_seconds)}s</p>
        </div>
        <div className="gc-panel p-6">
          <p className="text-sm text-[var(--gc-muted)] mb-1">URLs Crawled</p>
          <p className="text-2xl font-bold">{job.urls_crawled} / {job.urls_total}</p>
        </div>
        <div className="gc-panel p-6">
          <p className="text-sm text-[var(--gc-muted)] mb-1">Documents</p>
          <p className="text-2xl font-bold text-[var(--gc-accent)]">{job.documents_found}</p>
        </div>
      </div>

      <div className="gc-panel p-6">
        <h2 className="text-xl font-semibold mb-4 font-display text-[var(--gc-ink)]">
          Target Sources ({job.targets?.length || 0})
        </h2>
        <div className="flex flex-wrap gap-2">
          {job.targets?.map((target: string, i: number) => (
            <a
              key={i}
              href={target}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-[var(--gc-accent-soft)] text-[var(--gc-accent-strong)] rounded-lg text-sm"
            >
              {new URL(target).hostname}
            </a>
          ))}
        </div>
      </div>

      <div className="gc-panel p-6">
        <h2 className="text-xl font-semibold mb-4 font-display text-[var(--gc-ink)]">
          Configuration
        </h2>
        <pre className="bg-[var(--gc-surface-muted)] p-4 rounded-lg overflow-x-auto text-xs">
          {JSON.stringify(job.config, null, 2)}
        </pre>
      </div>
    </div>
  )
}
