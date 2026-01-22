'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Archive,
  ExternalLink,
  FileText,
  Filter,
  Layers,
  Search,
} from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import { archiveApi, ArchiveEntry, ApiError } from '@/lib/api/client'

function formatDate(value?: string | null) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return value
  }
}

function formatBytes(bytes?: number | null) {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ArchivePage() {
  const [entries, setEntries] = useState<ArchiveEntry[]>([])
  const [selected, setSelected] = useState<ArchiveEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [program, setProgram] = useState('all')
  const [subject, setSubject] = useState('all')
  const [docType, setDocType] = useState('all')
  const [year, setYear] = useState('all')
  const [domain, setDomain] = useState('all')
  const [limit, setLimit] = useState(200)

  const loadArchive = useCallback(async () => {
    setLoading(true)
    try {
      const response = await archiveApi.list({
        limit,
        search: search || undefined,
        program: program !== 'all' ? program : undefined,
        subject: subject !== 'all' ? subject : undefined,
        doc_type: docType !== 'all' ? docType : undefined,
        year: year !== 'all' ? Number(year) : undefined,
        domain: domain !== 'all' ? domain : undefined,
      })
      setEntries(response.entries)
      setError(null)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Failed to load archive')
      }
    } finally {
      setLoading(false)
    }
  }, [limit, search, program, subject, docType, year, domain])

  useEffect(() => {
    loadArchive()
  }, [loadArchive])

  const programOptions = useMemo(
    () => ['all', ...new Set(entries.map((entry) => entry.taxonomy?.program).filter(Boolean))],
    [entries]
  )
  const subjectOptions = useMemo(
    () => ['all', ...new Set(entries.map((entry) => entry.taxonomy?.subject).filter(Boolean))],
    [entries]
  )
  const docTypeOptions = useMemo(
    () => ['all', ...new Set(entries.map((entry) => entry.taxonomy?.document_type).filter(Boolean))],
    [entries]
  )
  const yearOptions = useMemo(
    () =>
      ['all', ...new Set(entries.map((entry) => entry.taxonomy?.year).filter(Boolean))]
        .sort()
        .map(String),
    [entries]
  )
  const domainOptions = useMemo(
    () => ['all', ...new Set(entries.flatMap((entry) => entry.source_domains || []))],
    [entries]
  )

  const duplicateCount = entries.filter((entry) => (entry.url_count || 0) > 1).length
  const totalUrls = entries.reduce((sum, entry) => sum + (entry.url_count || 0), 0)

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Archive"
        title="Canonical document archive"
        description="Review deduplicated documents, track aliases, and explore sources across crawls."
      />

      {error && (
        <div className="gc-panel-muted border-l-4 border-l-rose-400 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="gc-panel p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--gc-ink)] font-display">
                Archive Filters
              </h2>
              <p className="text-sm text-[var(--gc-muted)]">
                Search and filter canonical documents by taxonomy and source.
              </p>
            </div>
            <div className="gc-panel-muted px-3 py-1.5 text-xs text-[var(--gc-muted)]">
              {loading ? 'Loading...' : `${entries.length} canonical docs`}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-[var(--gc-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search titles, URLs, taxonomy..."
                className="w-full rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] py-2 pl-9 pr-3 text-sm text-[var(--gc-ink)]"
              />
            </div>
            <select
              value={program}
              onChange={(event) => setProgram(event.target.value)}
              className="rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2 text-sm text-[var(--gc-ink)]"
            >
              {programOptions.map((value) => (
                <option key={value} value={value}>
                  {value === 'all' ? 'All programs' : value}
                </option>
              ))}
            </select>
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2 text-sm text-[var(--gc-ink)]"
            >
              {subjectOptions.map((value) => (
                <option key={value} value={value}>
                  {value === 'all' ? 'All subjects' : value}
                </option>
              ))}
            </select>
            <select
              value={docType}
              onChange={(event) => setDocType(event.target.value)}
              className="rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2 text-sm text-[var(--gc-ink)]"
            >
              {docTypeOptions.map((value) => (
                <option key={value} value={value}>
                  {value === 'all' ? 'All document types' : value}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(event) => setYear(event.target.value)}
              className="rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2 text-sm text-[var(--gc-ink)]"
            >
              {yearOptions.map((value) => (
                <option key={value} value={value}>
                  {value === 'all' ? 'All years' : value}
                </option>
              ))}
            </select>
            <select
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              className="rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2 text-sm text-[var(--gc-ink)]"
            >
              {domainOptions.map((value) => (
                <option key={value} value={value}>
                  {value === 'all' ? 'All domains' : value}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 text-xs text-[var(--gc-muted)]">
              <Filter className="w-4 h-4" />
              <select
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
                className="rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] px-2 py-1 text-[var(--gc-ink)]"
              >
                {[100, 200, 500, 1000].map((value) => (
                  <option key={value} value={value}>
                    {value} results
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="gc-panel p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs text-[var(--gc-muted)] uppercase tracking-wider">
            <Archive className="w-4 h-4" />
            Archive summary
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="gc-panel-muted p-3">
              <div className="text-xs uppercase tracking-wider text-[var(--gc-muted)]">Canonical</div>
              <div className="text-lg font-semibold text-[var(--gc-ink)]">{entries.length}</div>
            </div>
            <div className="gc-panel-muted p-3">
              <div className="text-xs uppercase tracking-wider text-[var(--gc-muted)]">Total URLs</div>
              <div className="text-lg font-semibold text-[var(--gc-ink)]">{totalUrls}</div>
            </div>
            <div className="gc-panel-muted p-3">
              <div className="text-xs uppercase tracking-wider text-[var(--gc-muted)]">Duplicates</div>
              <div className="text-lg font-semibold text-[var(--gc-ink)]">{duplicateCount}</div>
            </div>
          </div>

          {selected ? (
            <div className="gc-panel-muted p-4 space-y-3 text-sm">
              <div className="text-xs uppercase tracking-wider text-[var(--gc-muted)]">
                Selected document
              </div>
              <div className="font-semibold text-[var(--gc-ink)]">
                {selected.title || selected.canonical_url}
              </div>
              {selected.canonical_url && (
                <a
                  href={selected.canonical_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[var(--gc-accent-strong)] inline-flex items-center gap-1"
                >
                  {selected.canonical_url}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <div className="flex flex-wrap gap-2 text-xs text-[var(--gc-muted)]">
                {selected.taxonomy?.program && (
                  <span className="rounded-full border border-[var(--gc-border)] px-2 py-0.5">
                    {selected.taxonomy.program}
                  </span>
                )}
                {selected.taxonomy?.subject && (
                  <span className="rounded-full border border-[var(--gc-border)] px-2 py-0.5">
                    {selected.taxonomy.subject}
                  </span>
                )}
                {selected.taxonomy?.document_type && (
                  <span className="rounded-full border border-[var(--gc-border)] px-2 py-0.5">
                    {selected.taxonomy.document_type}
                  </span>
                )}
                {selected.taxonomy?.year && (
                  <span className="rounded-full border border-[var(--gc-border)] px-2 py-0.5">
                    {selected.taxonomy.year}
                  </span>
                )}
              </div>
              <div className="text-xs text-[var(--gc-muted)]">
                {selected.url_count} URL aliases · {formatBytes(selected.file_size)}
              </div>
              <div className="space-y-1 text-xs text-[var(--gc-muted)]">
                {(selected.urls || []).map((url) => (
                  <div key={url} className="flex items-center gap-2">
                    <Layers className="w-3 h-3" />
                    <span className="break-all">{url}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="gc-panel-muted p-4 text-sm text-[var(--gc-muted)]">
              Select a document row to inspect aliases and metadata.
            </div>
          )}
        </div>
      </div>

      <div className="gc-panel p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--gc-ink)] font-display">
              Canonical Documents
            </h2>
            <p className="text-sm text-[var(--gc-muted)]">
              One row per canonical document with aliases grouped underneath.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="gc-panel-muted p-4 text-sm text-[var(--gc-muted)]">Loading archive...</div>
        ) : entries.length === 0 ? (
          <div className="gc-panel-muted p-6 text-sm text-[var(--gc-muted)]">
            No archived documents yet. Run ingestion to build the archive index.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-[var(--gc-muted)]">
                <tr>
                  <th className="py-2">Document</th>
                  <th className="py-2">Taxonomy</th>
                  <th className="py-2">Aliases</th>
                  <th className="py-2">Last Seen</th>
                  <th className="py-2">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--gc-border)]">
                {entries.map((entry) => (
                  <tr
                    key={entry.hash}
                    className="cursor-pointer hover:bg-[var(--gc-surface-muted)]"
                    onClick={() => setSelected(entry)}
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-[var(--gc-muted)] mt-1" />
                        <div>
                          <div className="font-medium text-[var(--gc-ink)]">
                            {entry.title || entry.canonical_url || 'Untitled document'}
                          </div>
                          {entry.canonical_url && (
                            <a
                              href={entry.canonical_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[var(--gc-accent-strong)] inline-flex items-center gap-1 mt-1"
                            >
                              {entry.canonical_url}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <div className="text-xs text-[var(--gc-muted)] mt-1">
                            {entry.source_domains?.join(', ') || 'Unknown domain'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-2">
                        {[
                          entry.taxonomy?.program,
                          entry.taxonomy?.subject,
                          entry.taxonomy?.year,
                          entry.taxonomy?.document_type,
                        ]
                          .filter(Boolean)
                          .map((item) => (
                            <span
                              key={`${entry.hash}-${item}`}
                              className="rounded-full border border-[var(--gc-border)] px-2 py-0.5 text-xs text-[var(--gc-muted)]"
                            >
                              {item}
                            </span>
                          ))}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-[var(--gc-muted)]">
                      {entry.url_count} URL{entry.url_count === 1 ? '' : 's'}
                    </td>
                    <td className="py-3 pr-4 text-[var(--gc-muted)]">
                      {formatDate(entry.last_seen_at)}
                    </td>
                    <td className="py-3 text-[var(--gc-muted)]">
                      {formatBytes(entry.file_size)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
