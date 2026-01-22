'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Database,
  Download,
  RefreshCw,
  Play,
  FileText,
  ExternalLink,
  Search,
  Layers,
  X,
} from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { crawlsApi, ingestApi, ApiError, CrawlSummary, IngestDocument, IngestStatusResponse } from '@/lib/api/client'

const DEFAULT_LIMIT = 200

function formatBytes(bytes?: number) {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function safeDomain(url?: string) {
  if (!url) return '-'
  try {
    return new URL(url).hostname
  } catch {
    return '-'
  }
}

function parseDateValue(value?: string | null) {
  if (!value) return 0
  const parsed = Date.parse(value)
  if (!Number.isNaN(parsed)) {
    return parsed
  }
  const match = value.match(/\d{4}/)
  if (match) {
    return Date.parse(`${match[0]}-01-01`)
  }
  return 0
}

export default function IngestionPage() {
  const [crawls, setCrawls] = useState<CrawlSummary[]>([])
  const [selectedCrawlId, setSelectedCrawlId] = useState('')
  const [selectedCrawl, setSelectedCrawl] = useState<CrawlSummary | null>(null)
  const [status, setStatus] = useState<IngestStatusResponse | null>(null)
  const [documents, setDocuments] = useState<IngestDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [statusLoading, setStatusLoading] = useState(false)
  const [docsLoading, setDocsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [docsError, setDocsError] = useState<string | null>(null)
  const [ingesting, setIngesting] = useState(false)
  const [curating, setCurating] = useState(false)
  const [nvIngestRunning, setNvIngestRunning] = useState(false)
  const [overwrite, setOverwrite] = useState(false)
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [runNemoCurator, setRunNemoCurator] = useState(false)
  const [runCuration, setRunCuration] = useState(false)
  const [extractText, setExtractText] = useState(false)
  const [nvIngestDryRun, setNvIngestDryRun] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [fileTypeFilter, setFileTypeFilter] = useState('all')
  const [programFilter, setProgramFilter] = useState('all')
  const [docTypeFilter, setDocTypeFilter] = useState('all')
  const [sortKey, setSortKey] = useState('source_date_desc')
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)
  const [dupSearch, setDupSearch] = useState('')
  const [dupLimit, setDupLimit] = useState(6)
  const [structuredOpen, setStructuredOpen] = useState(false)
  const [structuredTitle, setStructuredTitle] = useState('')
  const [structuredPath, setStructuredPath] = useState<string | null>(null)
  const [structuredPayload, setStructuredPayload] = useState<any>(null)
  const [structuredError, setStructuredError] = useState<string | null>(null)
  const [structuredLoading, setStructuredLoading] = useState(false)
  const [structuredMode, setStructuredMode] = useState<'json' | 'markdown'>('json')

  const loadCrawls = useCallback(async () => {
    try {
      setLoading(true)
      const response = await crawlsApi.list({ page: 1, limit: 25, sort_by: 'started_at', sort_order: 'desc' })
      setCrawls(response.crawls)
      if (!selectedCrawlId && response.crawls.length > 0) {
        setSelectedCrawlId(response.crawls[0].crawl_id)
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load crawls')
    } finally {
      setLoading(false)
    }
  }, [selectedCrawlId])

  const loadIngestion = useCallback(async (crawlId: string) => {
    if (!crawlId) return

    setStatusLoading(true)
    setDocsLoading(true)
    setError(null)
    setDocsError(null)

    try {
      const ingestStatus = await ingestApi.status(crawlId)
      setStatus(ingestStatus)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setStatus(null)
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load ingestion status')
      }
    } finally {
      setStatusLoading(false)
    }

    try {
      const docs = await ingestApi.listDocuments(crawlId, limit)
      setDocuments(docs.documents)
      setDocsError(null)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setDocuments([])
        setDocsError(null)
      } else {
        setDocsError(err instanceof Error ? err.message : 'Failed to load ingested documents')
      }
    } finally {
      setDocsLoading(false)
    }
  }, [limit])

  useEffect(() => {
    loadCrawls()
  }, [loadCrawls])

  useEffect(() => {
    const next = crawls.find((crawl) => crawl.crawl_id === selectedCrawlId) || null
    setSelectedCrawl(next)
    if (selectedCrawlId) {
      loadIngestion(selectedCrawlId)
    }
  }, [crawls, selectedCrawlId, loadIngestion])

  const openStructured = useCallback(async (
    path: string,
    label: string,
    title?: string,
    mode: 'json' | 'markdown' = 'json'
  ) => {
    if (!selectedCrawlId) return
    setStructuredOpen(true)
    setStructuredTitle(`${label} output · ${title || 'Untitled document'}`)
    setStructuredPath(null)
    setStructuredPayload(null)
    setStructuredError(null)
    setStructuredLoading(true)
    setStructuredMode(mode)
    try {
      const response = await ingestApi.getStructured(selectedCrawlId, path)
      setStructuredPath(response.path)
      setStructuredPayload(response.data)
    } catch (err) {
      setStructuredError(err instanceof Error ? err.message : 'Failed to load structured output')
    } finally {
      setStructuredLoading(false)
    }
  }, [selectedCrawlId])

  const closeStructured = useCallback(() => {
    setStructuredOpen(false)
    setStructuredError(null)
    setStructuredLoading(false)
  }, [])

  const fileTypeOptions = useMemo(
    () => ['all', ...new Set(documents.map((doc) => doc.file_type).filter(Boolean))],
    [documents]
  )
  const programOptions = useMemo(
    () => ['all', ...new Set(documents.map((doc) => doc.taxonomy?.program).filter(Boolean))],
    [documents]
  )
  const docTypeOptions = useMemo(
    () => ['all', ...new Set(documents.map((doc) => doc.taxonomy?.document_type).filter(Boolean))],
    [documents]
  )

  const filteredDocuments = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return documents.filter((doc) => {
      if (fileTypeFilter !== 'all' && doc.file_type !== fileTypeFilter) {
        return false
      }
      if (programFilter !== 'all' && doc.taxonomy?.program !== programFilter) {
        return false
      }
      if (docTypeFilter !== 'all' && doc.taxonomy?.document_type !== docTypeFilter) {
        return false
      }
      if (!query) {
        return true
      }
      const haystack = [
        doc.title,
        doc.url,
        doc.source_domain,
        doc.structured_path,
        doc.taxonomy?.program,
        doc.taxonomy?.level,
        doc.taxonomy?.subject,
        doc.taxonomy?.document_type,
        doc.taxonomy?.year?.toString(),
        doc.source_date,
        doc.metadata?.source_page_title,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [documents, searchTerm, fileTypeFilter, programFilter, docTypeFilter])

  const sortedDocuments = useMemo(() => {
    const docs = [...filteredDocuments]
    const getSourceDate = (doc: IngestDocument) =>
      parseDateValue(doc.source_date || doc.metadata?.source_page_date || doc.discovered_at)
    switch (sortKey) {
      case 'source_date_asc':
        return docs.sort((a, b) => getSourceDate(a) - getSourceDate(b))
      case 'source_date_desc':
        return docs.sort((a, b) => getSourceDate(b) - getSourceDate(a))
      case 'size_desc':
        return docs.sort((a, b) => (b.file_size || 0) - (a.file_size || 0))
      case 'size_asc':
        return docs.sort((a, b) => (a.file_size || 0) - (b.file_size || 0))
      case 'quality_desc':
        return docs.sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0))
      case 'quality_asc':
        return docs.sort((a, b) => (a.quality_score || 0) - (b.quality_score || 0))
      case 'title_desc':
        return docs.sort((a, b) => b.title.localeCompare(a.title))
      case 'title_asc':
        return docs.sort((a, b) => a.title.localeCompare(b.title))
      default:
        return docs
    }
  }, [filteredDocuments, sortKey])

  const pageCount = Math.max(1, Math.ceil(sortedDocuments.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const startIndex = sortedDocuments.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, sortedDocuments.length)
  const pagedDocuments = sortedDocuments.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => {
    setPage(1)
  }, [searchTerm, fileTypeFilter, programFilter, docTypeFilter, sortKey, pageSize])

  const handleRunIngest = async () => {
    if (!selectedCrawlId) return
    setIngesting(true)
    try {
      const shouldRunNemo = runNemoCurator || runCuration || extractText
      const options = shouldRunNemo
        ? {
            run_nemo_curator: true,
            curate: runCuration,
            extract_text: extractText,
          }
        : undefined
      await ingestApi.run(selectedCrawlId, overwrite, options)
      await loadIngestion(selectedCrawlId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to ingest crawl results')
    } finally {
      setIngesting(false)
    }
  }

  const handleDownload = async (
    format: 'jsonl' | 'json' | 'nemo_curator_jsonl' | 'nemo_curated_jsonl'
  ) => {
    if (!selectedCrawlId) return
    try {
      const result = await ingestApi.download(selectedCrawlId, format)
      const content = format === 'json'
        ? JSON.stringify(result.documents || [], null, 2)
        : result.content || ''
      const blob = new Blob([content], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const extension = format === 'json' ? 'json' : 'jsonl'
      link.download = `ingest-${selectedCrawlId}.${extension}`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download ingestion output')
    }
  }

  const handleRunCuration = async () => {
    if (!selectedCrawlId) return
    setCurating(true)
    try {
      await ingestApi.curate(selectedCrawlId)
      await loadIngestion(selectedCrawlId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run curation')
    } finally {
      setCurating(false)
    }
  }

  const handleRunNvIngest = async () => {
    if (!selectedCrawlId) return
    setNvIngestRunning(true)
    try {
      await ingestApi.runNvIngest(selectedCrawlId, nvIngestDryRun)
      await loadIngestion(selectedCrawlId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run NV Ingest')
    } finally {
      setNvIngestRunning(false)
    }
  }

  const taxonomyChips = useMemo(() => {
    if (!status?.taxonomy) return []
    const hints = status.taxonomy?.hints || {}
    const defaults = status.taxonomy?.defaults || {}
    const entries = { ...defaults, ...hints }
    return Object.entries(entries)
      .filter(([, value]) => value)
      .map(([key, value]) => ({ key, value }))
  }, [status])

  const duplicateEntries = useMemo(() => {
    const duplicates = status?.dedupe?.duplicates || {}
    const entries = Object.entries(duplicates).map(([canonical, dupes]) => ({
      canonical,
      duplicates: dupes,
    }))
    const query = dupSearch.trim().toLowerCase()
    const filtered = query
      ? entries.filter((entry) =>
          [entry.canonical, ...(entry.duplicates || [])]
            .join(' ')
            .toLowerCase()
            .includes(query)
        )
      : entries
    return filtered
  }, [status, dupSearch])

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Ingestion"
        title="Normalize, tag, and export crawl outputs"
        description="Run the ingestion pipeline to generate structured JSONL outputs and review the normalized documents."
        actions={
          <button onClick={loadCrawls} className="gc-button-secondary">
            <RefreshCw size={16} />
            Refresh crawls
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="gc-panel p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--gc-ink)] font-display">Ingestion Runbook</h2>
              <p className="text-sm text-[var(--gc-muted)]">
                Choose a crawl, run ingestion, and download the structured dataset.
              </p>
            </div>
            <div className="gc-panel-muted px-3 py-1.5 text-xs text-[var(--gc-muted)]">
              {loading ? 'Loading...' : `${crawls.length} crawls`}
            </div>
          </div>

          {error && (
            <div className="gc-panel-muted border-l-4 border-l-rose-400 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--gc-muted)]">
              Crawl selection
            </label>
            <select
              value={selectedCrawlId}
              onChange={(event) => setSelectedCrawlId(event.target.value)}
              className="w-full rounded-xl border border-[var(--gc-border)] bg-[var(--gc-surface)] px-4 py-2 text-[var(--gc-ink)]"
            >
              <option value="">Select a crawl...</option>
              {crawls.map((crawl) => (
                <option key={crawl.crawl_id} value={crawl.crawl_id}>
                  {crawl.query || 'Untitled crawl'} · {crawl.crawl_id.substring(0, 8)} · {crawl.status}
                </option>
              ))}
            </select>
          </div>

          {selectedCrawl && (
            <div className="gc-panel-muted p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs text-[var(--gc-muted)] uppercase tracking-wider">
                <Database className="w-4 h-4" />
                Crawl summary
              </div>
              <div className="text-sm text-[var(--gc-ink)] font-medium">
                {selectedCrawl.query || 'Untitled crawl'}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-[var(--gc-muted)]">
                <span>Status: {selectedCrawl.status}</span>
                <span>Documents: {selectedCrawl.documents_found}</span>
                <span>Success: {selectedCrawl.success_rate.toFixed(1)}%</span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-[var(--gc-muted)]">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--gc-accent)]"
                  checked={overwrite}
                  onChange={(event) => setOverwrite(event.target.checked)}
                />
                Overwrite existing ingestion output
              </label>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunIngest}
                  disabled={!selectedCrawlId || ingesting}
                  className="gc-button"
                >
                  {ingesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {ingesting ? 'Running...' : 'Run ingestion'}
                </button>
                <button
                  onClick={handleRunCuration}
                  disabled={!status?.nemo?.nemo_curator_jsonl || curating}
                  className="gc-button-secondary"
                >
                  {curating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {curating ? 'Curating...' : 'Run curation'}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-[var(--gc-muted)]">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--gc-accent)]"
                  checked={runNemoCurator}
                  onChange={(event) => {
                    const next = event.target.checked
                    setRunNemoCurator(next)
                    if (!next) {
                      setRunCuration(false)
                      setExtractText(false)
                    }
                  }}
                />
                Generate Nemo Curator JSONL
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--gc-accent)]"
                  checked={extractText}
                  onChange={(event) => setExtractText(event.target.checked)}
                  disabled={!runNemoCurator}
                />
                Extract text during ingestion
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--gc-accent)]"
                  checked={runCuration}
                  onChange={(event) => setRunCuration(event.target.checked)}
                  disabled={!runNemoCurator}
                />
                Run curation filters
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleDownload('jsonl')}
                  disabled={!status}
                  className="gc-button-secondary"
                >
                  <Download className="w-4 h-4" />
                  JSONL
                </button>
                <button
                  onClick={() => handleDownload('json')}
                  disabled={!status}
                  className="gc-button-secondary"
                >
                  <Download className="w-4 h-4" />
                  JSON
                </button>
                <button
                  onClick={() => handleDownload('nemo_curator_jsonl')}
                  disabled={!status?.nemo?.nemo_curator_jsonl}
                  className="gc-button-secondary"
                >
                  <Download className="w-4 h-4" />
                  Nemo JSONL
                </button>
                <button
                  onClick={() => handleDownload('nemo_curated_jsonl')}
                  disabled={!status?.nemo?.nemo_curated_jsonl}
                  className="gc-button-secondary"
                >
                  <Download className="w-4 h-4" />
                  Curated JSONL
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--gc-muted)]">
              <button
                onClick={handleRunNvIngest}
                disabled={!status?.nemo?.nv_ingest_manifest || nvIngestRunning}
                className="gc-button-secondary"
              >
                {nvIngestRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {nvIngestRunning ? 'Running NV Ingest...' : 'Run NV Ingest'}
              </button>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--gc-accent)]"
                  checked={nvIngestDryRun}
                  onChange={(event) => setNvIngestDryRun(event.target.checked)}
                />
                Dry run
              </label>
              {!status?.nemo?.nv_ingest_manifest && (
                <span className="text-xs text-[var(--gc-muted)]">
                  Run ingestion with raw files to enable NV Ingest.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="gc-panel p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--gc-ink)] font-display">Ingestion Status</h2>
            <p className="text-sm text-[var(--gc-muted)]">
              Manifest details and taxonomy hints from the last ingestion run.
            </p>
          </div>

          {statusLoading ? (
            <div className="gc-panel-muted p-4 text-sm text-[var(--gc-muted)]">Loading status...</div>
          ) : status ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="gc-panel-muted p-3">
                  <div className="text-xs uppercase tracking-wider text-[var(--gc-muted)]">Ingested</div>
                  <div className="text-lg font-semibold text-[var(--gc-ink)]">
                    {status.counts.ingested}
                  </div>
                </div>
                <div className="gc-panel-muted p-3">
                  <div className="text-xs uppercase tracking-wider text-[var(--gc-muted)]">Duplicates</div>
                  <div className="text-lg font-semibold text-[var(--gc-ink)]">
                    {status.counts.duplicates}
                  </div>
                </div>
                <div className="gc-panel-muted p-3">
                  <div className="text-xs uppercase tracking-wider text-[var(--gc-muted)]">Source</div>
                  <div className="text-lg font-semibold text-[var(--gc-ink)]">
                    {status.counts.source_documents}
                  </div>
                </div>
              </div>

              <div className="gc-panel-muted p-4 space-y-2 text-xs text-[var(--gc-muted)]">
                <div>Manifest: {status.output.manifest}</div>
                <div>Documents: {status.output.documents_jsonl}</div>
                <div>Structured path: {status.output_structure || 'region/program/level/subject/year/document_type/'}</div>
              </div>

              {taxonomyChips.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--gc-muted)]">
                    Taxonomy hints
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {taxonomyChips.map((chip) => (
                      <span
                        key={chip.key}
                        className="rounded-full border border-[var(--gc-border)] px-3 py-1 text-xs text-[var(--gc-muted)]"
                      >
                        {chip.key}: {String(chip.value)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {status.nemo && (
                <div className="gc-panel-muted p-4 space-y-2 text-xs text-[var(--gc-muted)]">
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--gc-muted)]">
                    Nemo export
                  </div>
                  <div>Enabled: {status.nemo.enabled ? 'Yes' : 'No'}</div>
                  {status.nemo.counts?.records_written !== undefined && (
                    <div>Records: {status.nemo.counts.records_written}</div>
                  )}
                  {status.nemo.extraction && (
                    <div>
                      Extraction: {status.nemo.extraction.succeeded || 0} ok · {status.nemo.extraction.failed || 0} failed
                    </div>
                  )}
                  {status.nemo.curation && (
                    <div>
                      Curated: {status.nemo.curation.kept || 0} kept · {status.nemo.curation.filtered || 0} filtered
                    </div>
                  )}
                  {status.nemo.nv_ingest_manifest && (
                    <div>NV Ingest manifest: {status.nemo.nv_ingest_manifest}</div>
                  )}
                  {status.nemo.nv_ingest_run && (
                    <div>
                      NV Ingest: {status.nemo.nv_ingest_run.status || 'unknown'} ·{' '}
                      {status.nemo.nv_ingest_run.results ?? 0} ok ·{' '}
                      {status.nemo.nv_ingest_run.failures ?? 0} failed
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="gc-panel-muted p-4 text-sm text-[var(--gc-muted)]">
              No ingestion manifest found yet. Run ingestion to generate it.
            </div>
          )}
        </div>
      </div>

      <div className="gc-panel p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--gc-ink)] font-display">Ingested Documents</h2>
            <p className="text-sm text-[var(--gc-muted)]">
              Preview the normalized documents from the ingestion output.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--gc-muted)]">
            <span>Preview limit</span>
            <select
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
              className="rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-1 text-[var(--gc-ink)]"
            >
              {[50, 100, 200, 500, 1000].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-[var(--gc-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search titles, URLs, taxonomy..."
              className="w-full rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] py-2 pl-9 pr-3 text-sm text-[var(--gc-ink)]"
            />
          </div>
          <select
            value={fileTypeFilter}
            onChange={(event) => setFileTypeFilter(event.target.value)}
            className="rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2 text-sm text-[var(--gc-ink)]"
          >
            {fileTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type === 'all' ? 'All file types' : type.toUpperCase()}
              </option>
            ))}
          </select>
          <select
            value={programFilter}
            onChange={(event) => setProgramFilter(event.target.value)}
            className="rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2 text-sm text-[var(--gc-ink)]"
          >
            {programOptions.map((program) => (
              <option key={program} value={program}>
                {program === 'all' ? 'All programs' : program}
              </option>
            ))}
          </select>
          <select
            value={docTypeFilter}
            onChange={(event) => setDocTypeFilter(event.target.value)}
            className="rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2 text-sm text-[var(--gc-ink)]"
          >
            {docTypeOptions.map((docType) => (
              <option key={docType} value={docType}>
                {docType === 'all' ? 'All document types' : docType}
              </option>
            ))}
          </select>
          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value)}
            className="rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2 text-sm text-[var(--gc-ink)]"
          >
            <option value="source_date_desc">Source date (newest)</option>
            <option value="source_date_asc">Source date (oldest)</option>
            <option value="size_desc">File size (large to small)</option>
            <option value="size_asc">File size (small to large)</option>
            <option value="quality_desc">Quality (high to low)</option>
            <option value="quality_asc">Quality (low to high)</option>
            <option value="title_asc">Title (A-Z)</option>
            <option value="title_desc">Title (Z-A)</option>
          </select>
          <select
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
            className="rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2 text-sm text-[var(--gc-ink)]"
          >
            {[10, 25, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
        </div>

        {docsLoading ? (
          <div className="gc-panel-muted p-4 text-sm text-[var(--gc-muted)]">Loading documents...</div>
        ) : docsError ? (
          <div className="gc-panel-muted border-l-4 border-l-rose-400 p-3 text-sm text-rose-700">
            {docsError}
          </div>
        ) : documents.length === 0 ? (
          <div className="gc-panel-muted p-6 text-sm text-[var(--gc-muted)]">
            No ingested documents available. Run ingestion to generate results.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="px-2 pb-3 text-xs text-[var(--gc-muted)]">
              Showing {startIndex}-{endIndex} of {sortedDocuments.length}
            </div>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-[var(--gc-muted)]">
                <tr>
                  <th className="py-2">Document</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Source</th>
                  <th className="py-2">Source Date</th>
                  <th className="py-2">Taxonomy</th>
                  <th className="py-2">Outputs</th>
                  <th className="py-2">Path</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gc-border)]">
                {pagedDocuments.map((doc, index) => {
                  const taxonomyParts = [
                    doc.taxonomy?.program,
                    doc.taxonomy?.level,
                    doc.taxonomy?.subject,
                    doc.taxonomy?.year,
                    doc.taxonomy?.document_type,
                  ].filter(Boolean)
                  const structuredFile = doc.metadata?.structured_file_path as string | undefined
                  const outlineFile = doc.metadata?.outline_file_path as string | undefined

                  return (
                    <tr key={`${doc.url}-${index}`} className="align-top">
                      <td className="py-3 pr-4">
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-[var(--gc-muted)] mt-1" />
                          <div>
                            <div className="font-medium text-[var(--gc-ink)]">
                              {doc.title || 'Untitled document'}
                            </div>
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[var(--gc-accent-strong)] inline-flex items-center gap-1 mt-1"
                            >
                              {doc.url}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <div className="text-xs text-[var(--gc-muted)] mt-1">
                              {formatBytes(doc.file_size)} · Quality {doc.quality_score ?? '-'}%
                            </div>
                            {(doc.source_date || doc.metadata?.source_page_date) && (
                              <div className="text-xs text-[var(--gc-muted)] mt-1">
                                Source date {doc.source_date || doc.metadata?.source_page_date}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-[var(--gc-muted)] uppercase">
                        {doc.file_type || 'n/a'}
                      </td>
                      <td className="py-3 pr-4 text-[var(--gc-muted)]">
                        {doc.source_domain || safeDomain(doc.url)}
                      </td>
                      <td className="py-3 pr-4 text-[var(--gc-muted)]">
                        {doc.source_date || doc.metadata?.source_page_date || '-'}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-2">
                          {taxonomyParts.length > 0 ? (
                            taxonomyParts.map((item) => (
                              <span
                                key={`${doc.url}-${item}`}
                                className="rounded-full border border-[var(--gc-border)] px-2 py-0.5 text-xs text-[var(--gc-muted)]"
                              >
                                {item}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-[var(--gc-muted)]">Not tagged</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => structuredFile && openStructured(structuredFile, 'Structured', doc.title, 'json')}
                            className="gc-button-secondary text-xs"
                            disabled={!structuredFile}
                          >
                            Structured
                          </button>
                          <button
                            type="button"
                            onClick={() => outlineFile && openStructured(outlineFile, 'Outline', doc.title, 'json')}
                            className="gc-button-secondary text-xs"
                            disabled={!outlineFile}
                          >
                            Outline
                          </button>
                          <button
                            type="button"
                            onClick={() => structuredFile && openStructured(structuredFile, 'Markdown', doc.title, 'markdown')}
                            className="gc-button-secondary text-xs"
                            disabled={!structuredFile}
                          >
                            Markdown
                          </button>
                        </div>
                      </td>
                      <td className="py-3 text-xs text-[var(--gc-muted)] font-mono">
                        {doc.structured_path || '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="mt-4 flex items-center justify-between text-xs text-[var(--gc-muted)]">
              <span>
                Page {currentPage} of {pageCount}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                  className="gc-button-secondary"
                  disabled={currentPage <= 1}
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.min(prev + 1, pageCount))}
                  className="gc-button-secondary"
                  disabled={currentPage >= pageCount}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {status?.dedupe?.duplicates && (
        <div className="gc-panel p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--gc-ink)] font-display flex items-center gap-2">
                <Layers className="w-4 h-4 text-[var(--gc-muted)]" />
                Duplicate Groups
              </h2>
              <p className="text-sm text-[var(--gc-muted)]">
                Canonical URLs with alternate sources detected during ingestion.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--gc-muted)]">
              <span>Show</span>
              <select
                value={dupLimit}
                onChange={(event) => setDupLimit(Number(event.target.value))}
                className="rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] px-2 py-1 text-[var(--gc-ink)]"
              >
                {[6, 12, 24, 50].map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative max-w-md">
            <Search className="w-4 h-4 text-[var(--gc-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={dupSearch}
              onChange={(event) => setDupSearch(event.target.value)}
              placeholder="Search duplicates by URL..."
              className="w-full rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] py-2 pl-9 pr-3 text-sm text-[var(--gc-ink)]"
            />
          </div>

          {duplicateEntries.length === 0 ? (
            <div className="gc-panel-muted p-4 text-sm text-[var(--gc-muted)]">
              No duplicates detected for this ingestion run.
            </div>
          ) : (
            <div className="grid gap-3">
              {duplicateEntries.slice(0, dupLimit).map((entry) => (
                <div key={entry.canonical} className="gc-panel-muted p-4 space-y-2 text-sm">
                  <div className="text-xs uppercase tracking-wider text-[var(--gc-muted)]">
                    Canonical
                  </div>
                  <a
                    href={entry.canonical}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--gc-accent-strong)] inline-flex items-center gap-1 break-all"
                  >
                    {entry.canonical}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <div className="text-xs text-[var(--gc-muted)]">
                    {entry.duplicates.length} alternate source{entry.duplicates.length !== 1 ? 's' : ''}
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-[var(--gc-muted)] break-all">
                    {entry.duplicates.map((dup) => (
                      <span key={dup}>↳ {dup}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {structuredOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="gc-panel w-full max-w-5xl p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-wider text-[var(--gc-muted)]">Structured Output</div>
                <h3 className="text-lg font-semibold text-[var(--gc-ink)]">{structuredTitle}</h3>
                {structuredPath && (
                  <div className="text-xs text-[var(--gc-muted)] font-mono mt-1">{structuredPath}</div>
                )}
              </div>
              <button
                type="button"
                onClick={closeStructured}
                className="gc-button-secondary inline-flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Close
              </button>
            </div>

            <div className="mt-4 max-h-[70vh] overflow-auto rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] p-4 text-xs text-[var(--gc-ink)]">
              {structuredLoading ? (
                <div className="text-sm text-[var(--gc-muted)]">Loading structured output…</div>
              ) : structuredError ? (
                <div className="text-sm text-rose-700">{structuredError}</div>
              ) : structuredPayload ? (
                structuredMode === 'markdown' ? (
                  <pre className="whitespace-pre-wrap">
                    {structuredPayload.content_markdown || structuredPayload.content || 'No markdown content found.'}
                  </pre>
                ) : (
                  <pre className="whitespace-pre-wrap">{JSON.stringify(structuredPayload, null, 2)}</pre>
                )
              ) : (
                <div className="text-sm text-[var(--gc-muted)]">No structured payload found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
