'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileText, Download, ExternalLink, Tag, Filter, Search, ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react'
import { documentsApi, Document as ApiDocument, ApiError } from '@/lib/api/client'

interface Document extends ApiDocument {}

interface DocumentFeedProps {
  crawlId?: string
  limit?: number
}

export function DocumentFeed({ crawlId, limit }: DocumentFeedProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [fileTypeFilter, setFileTypeFilter] = useState('all')
  const [docTypeFilter, setDocTypeFilter] = useState('all')
  const [sortKey, setSortKey] = useState('recent')
  const [pageSize, setPageSize] = useState(limit ? Math.min(limit, 10) : 25)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchLimit = limit ?? 1000
    const fetchDocuments = async () => {
      try {
        const data = crawlId
          ? await documentsApi.getByCrawl(crawlId, fetchLimit)
          : await documentsApi.getRecent(fetchLimit)

        setDocuments(data.documents || [])
        setError(null)
      } catch (err) {
        console.error('Failed to fetch documents:', err)
        if (err instanceof ApiError) {
          setError(err.message)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchDocuments()
    const interval = setInterval(fetchDocuments, 3000)
    return () => clearInterval(interval)
  }, [crawlId, limit])

  const allTags = [...new Set(documents.flatMap(doc => doc.tags))]
  const fileTypeOptions = useMemo(
    () => ['all', ...new Set(documents.map(doc => doc.file_type).filter(Boolean))],
    [documents]
  )
  const docTypeOptions = useMemo(
    () => ['all', ...new Set(documents.map(doc => doc.document_type).filter(Boolean))],
    [documents]
  )

  const filteredDocs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return documents.filter((doc) => {
      if (fileTypeFilter !== 'all' && doc.file_type !== fileTypeFilter) {
        return false
      }
      if (docTypeFilter !== 'all' && doc.document_type !== docTypeFilter) {
        return false
      }
      if (selectedTags.size > 0 && !doc.tags.some(tag => selectedTags.has(tag))) {
        return false
      }
      if (!query) {
        return true
      }
      const haystack = [
        doc.title,
        doc.url,
        doc.file_type,
        doc.document_type,
        doc.source_date,
        doc.source_page,
        doc.metadata?.subject,
        doc.metadata?.exam_type,
        doc.metadata?.year?.toString(),
        ...doc.tags,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [documents, selectedTags, searchTerm, fileTypeFilter, docTypeFilter])

  const sortedDocs = useMemo(() => {
    const docs = [...filteredDocs]
    switch (sortKey) {
      case 'oldest':
        return docs.sort((a, b) => new Date(a.discovered_at).getTime() - new Date(b.discovered_at).getTime())
      case 'quality_desc':
        return docs.sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0))
      case 'quality_asc':
        return docs.sort((a, b) => (a.quality_score || 0) - (b.quality_score || 0))
      case 'size_desc':
        return docs.sort((a, b) => (b.file_size || 0) - (a.file_size || 0))
      case 'size_asc':
        return docs.sort((a, b) => (a.file_size || 0) - (b.file_size || 0))
      case 'title_asc':
        return docs.sort((a, b) => a.title.localeCompare(b.title))
      case 'title_desc':
        return docs.sort((a, b) => b.title.localeCompare(a.title))
      default:
        return docs.sort((a, b) => new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime())
    }
  }, [filteredDocs, sortKey])

  const pageCount = Math.max(1, Math.ceil(sortedDocs.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const startIndex = sortedDocs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, sortedDocs.length)
  const pagedDocs = sortedDocs.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => {
    setPage(1)
  }, [searchTerm, selectedTags, fileTypeFilter, docTypeFilter, sortKey, pageSize])

  const toggleTag = (tag: string) => {
    const newSelected = new Set(selectedTags)
    if (newSelected.has(tag)) {
      newSelected.delete(tag)
    } else {
      newSelected.add(tag)
    }
    setSelectedTags(newSelected)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-emerald-700 bg-emerald-500/10'
    if (score >= 60) return 'text-amber-700 bg-amber-500/10'
    return 'text-rose-700 bg-rose-500/10'
  }

  const getFileTypeIcon = (type: string) => {
    const colors: Record<string, string> = {
      pdf: 'text-red-600',
      doc: 'text-blue-600',
      docx: 'text-blue-600',
      xls: 'text-green-600',
      xlsx: 'text-green-600',
      ppt: 'text-orange-600',
      pptx: 'text-orange-600',
    }
    return colors[type.toLowerCase()] || 'text-gray-600'
  }

  return (
    <div className="gc-panel">
      {/* Header */}
      <div className="p-4 border-b border-[var(--gc-border)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[var(--gc-ink)] font-display">
            Document Feed
            <span className="ml-2 text-sm text-[var(--gc-muted)]">
              ({filteredDocs.length})
            </span>
          </h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="gc-icon-button"
          >
            <Filter size={18} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--gc-muted)]" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search documents, URLs, tags..."
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
          {docTypeOptions.length > 1 && (
            <select
              value={docTypeFilter}
              onChange={(event) => setDocTypeFilter(event.target.value)}
              className="rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2 text-sm text-[var(--gc-ink)]"
            >
              {docTypeOptions.map((type) => (
                <option key={type || 'unknown'} value={type || 'unknown'}>
                  {type === 'all' ? 'All document types' : type?.replace(/_/g, ' ') || 'Unknown'}
                </option>
              ))}
            </select>
          )}
          <select
            value={sortKey}
            onChange={(event) => setSortKey(event.target.value)}
            className="rounded-lg border border-[var(--gc-border)] bg-[var(--gc-surface)] px-3 py-2 text-sm text-[var(--gc-ink)]"
          >
            <option value="recent">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="quality_desc">Quality (high to low)</option>
            <option value="quality_asc">Quality (low to high)</option>
            <option value="size_desc">File size (large to small)</option>
            <option value="size_asc">File size (small to large)</option>
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

        {/* Tag Filters */}
        {showFilters && allTags.length > 0 && (
          <div className="gc-panel-muted p-4">
            <span className="text-sm font-medium text-[var(--gc-ink)] mb-2 block">Filter by tags:</span>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedTags.has(tag)
                      ? 'bg-[var(--gc-accent)] text-white'
                      : 'border border-[var(--gc-border)] text-[var(--gc-muted)] hover:border-[var(--gc-accent)] hover:text-[var(--gc-accent-strong)]'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Documents List */}
      <div className="px-4 py-3 text-xs text-[var(--gc-muted)] border-b border-[var(--gc-border)]">
        {sortedDocs.length === 0
          ? 'No documents to display.'
          : `Showing ${startIndex}-${endIndex} of ${sortedDocs.length}`}
      </div>

      <div className="max-h-96 overflow-y-auto divide-y divide-[var(--gc-border)]">
        {loading ? (
          <div className="p-8 text-center text-[var(--gc-muted)] flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            Loading documents...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-600 flex items-center justify-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        ) : pagedDocs.length === 0 ? (
          <div className="p-8 text-center text-[var(--gc-muted)]">
            {documents.length === 0
              ? 'No documents discovered yet. Documents will appear here as they are found.'
              : 'No documents match your filters.'}
          </div>
        ) : (
          pagedDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-4 hover:bg-[var(--gc-surface-muted)] transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={20} className={getFileTypeIcon(doc.file_type)} />
                    <h4 className="font-medium text-[var(--gc-ink)] truncate">
                      {doc.title}
                    </h4>
                  </div>

                  {/* URL */}
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--gc-accent-strong)] hover:underline flex items-center gap-1 mb-2"
                  >
                    <span className="truncate">{doc.url}</span>
                    <ExternalLink size={14} />
                  </a>

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--gc-muted)] mb-2">
                    <span className="uppercase">{doc.file_type}</span>
                    {doc.document_type && (
                      <span className="px-2 py-0.5 rounded bg-slate-500/10 text-slate-700">
                        {doc.document_type.replace(/_/g, ' ')}
                      </span>
                    )}
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span className={`px-2 py-0.5 rounded ${getQualityColor(doc.quality_score)}`}>
                      Quality: {doc.quality_score}%
                    </span>
                    <span>{new Date(doc.discovered_at).toLocaleString()}</span>
                  </div>
                  {(doc.source_date || doc.source_page) && (
                    <div className="text-xs text-[var(--gc-muted)] mb-2">
                      {doc.source_date && <span>Source date: {doc.source_date}</span>}
                      {doc.source_date && doc.source_page && <span className="mx-1">·</span>}
                      {doc.source_page && (
                        <a
                          href={doc.source_page}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--gc-accent-strong)] hover:underline"
                        >
                          Source page
                        </a>
                      )}
                    </div>
                  )}

                  {/* Additional Metadata */}
                  {doc.metadata && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--gc-muted)] mb-2">
                      {doc.metadata.subject && (
                        <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-700">
                          {doc.metadata.subject}
                        </span>
                      )}
                      {doc.metadata.exam_type && (
                        <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-700">
                          {doc.metadata.exam_type}
                        </span>
                      )}
                      {doc.metadata.year && (
                        <span className="px-2 py-0.5 rounded bg-slate-500/10 text-slate-700">
                          {doc.metadata.year}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  {doc.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {doc.tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border border-[var(--gc-border)] text-[var(--gc-muted)]"
                        >
                          <Tag size={12} />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <a
                    href={doc.url}
                    download
                    className="gc-icon-button"
                    title="Download"
                  >
                    <Download size={18} />
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-center justify-between p-4 border-t border-[var(--gc-border)] text-xs text-[var(--gc-muted)]">
        <span>
          Page {currentPage} of {pageCount}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            className="gc-icon-button"
            disabled={currentPage <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.min(prev + 1, pageCount))}
            className="gc-icon-button"
            disabled={currentPage >= pageCount}
            aria-label="Next page"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
