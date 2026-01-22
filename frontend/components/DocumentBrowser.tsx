'use client';

/**
 * Document Browser Component
 *
 * Displays crawled documents with:
 * - Grid/List view toggle
 * - Bulk selection
 * - Download actions
 * - Preview capability
 */

import { useState, useEffect } from 'react';
import {
  FileText,
  FileIcon,
  Download,
  Grid,
  List,
  Search,
  Filter,
  CheckSquare,
  Square,
  ExternalLink,
  Eye,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { documentsApi, Document } from '@/lib/api/client';
import { EmptyState } from './EmptyState';

interface DocumentBrowserProps {
  crawlId: string;
  className?: string;
}

function getFileIcon(fileType: string): string {
  const iconMap: Record<string, string> = {
    pdf: '/icons/pdf.svg',
    doc: '/icons/doc.svg',
    docx: '/icons/doc.svg',
    xls: '/icons/xls.svg',
    xlsx: '/icons/xls.svg',
    ppt: '/icons/ppt.svg',
    pptx: '/icons/ppt.svg',
    html: '/icons/html.svg',
    txt: '/icons/txt.svg',
    json: '/icons/json.svg',
  };
  return iconMap[fileType.toLowerCase()] || '/icons/file.svg';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function getQualityColor(score: number): string {
  if (score >= 0.8) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  if (score >= 0.6) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
  return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
}

interface DocumentCardProps {
  document: Document;
  isSelected: boolean;
  onToggleSelect: () => void;
  onPreview: () => void;
  onDownload: () => void;
}

function DocumentCard({
  document,
  isSelected,
  onToggleSelect,
  onPreview,
  onDownload,
}: DocumentCardProps) {
  return (
    <div
      className={`
        bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 transition-all duration-200
        ${isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'}
      `}
    >
      {/* Header with checkbox */}
      <div className="flex items-start justify-between mb-3">
        <button
          onClick={onToggleSelect}
          className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
          aria-label={isSelected ? 'Deselect' : 'Select'}
        >
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          ) : (
            <Square className="w-5 h-5" />
          )}
        </button>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getQualityColor(document.quality_score)}`}>
          {Math.round(document.quality_score * 100)}%
        </span>
      </div>

      {/* File type icon */}
      <div className="flex justify-center mb-3">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
          <FileText className="w-8 h-8 text-gray-400" />
        </div>
      </div>

      {/* Title */}
      <h4 className="font-medium text-gray-900 dark:text-white mb-2 line-clamp-2 text-sm">
        {document.title || 'Untitled Document'}
      </h4>

      {/* Metadata */}
      <div className="space-y-1 text-xs text-gray-500 dark:text-gray-400 mb-4">
        <div className="flex items-center gap-2">
          <FileIcon className="w-3 h-3" />
          <span>{document.file_type?.toUpperCase() || 'Unknown'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>{formatFileSize(document.file_size)}</span>
        </div>
      </div>

      {/* Tags */}
      {document.tags && document.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {document.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded"
            >
              {tag}
            </span>
          ))}
          {document.tags.length > 3 && (
            <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
              +{document.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onPreview}
          className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>
        <button
          onClick={onDownload}
          className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          aria-label="Download"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface DocumentRowProps {
  document: Document;
  isSelected: boolean;
  onToggleSelect: () => void;
  onPreview: () => void;
  onDownload: () => void;
}

function DocumentRow({
  document,
  isSelected,
  onToggleSelect,
  onPreview,
  onDownload,
}: DocumentRowProps) {
  return (
    <tr className={`
      border-b border-gray-200 dark:border-gray-700
      ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}
    `}>
      <td className="px-4 py-3">
        <button onClick={onToggleSelect} className="p-1">
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          ) : (
            <Square className="w-5 h-5 text-gray-400" />
          )}
        </button>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center">
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white line-clamp-1">
              {document.title || 'Untitled Document'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
              {document.url}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
        {document.file_type?.toUpperCase() || 'Unknown'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
        {formatFileSize(document.file_size)}
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getQualityColor(document.quality_score)}`}>
          {Math.round(document.quality_score * 100)}%
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onPreview}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={onDownload}
            className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <a
            href={document.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </td>
    </tr>
  );
}

export function DocumentBrowser({ crawlId, className = '' }: DocumentBrowserProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDocuments();
  }, [crawlId]);

  const loadDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await documentsApi.getByCrawl(crawlId);
      setDocuments(data.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (docId: string) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedDocs.size === filteredDocuments.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(filteredDocuments.map((d) => d.id)));
    }
  };

  const handleDownload = (document: Document) => {
    // Open document URL in new tab for download
    window.open(document.url, '_blank');
  };

  const handlePreview = (document: Document) => {
    // For now, open in new tab
    window.open(document.url, '_blank');
  };

  const handleBulkDownload = () => {
    // Download selected documents as ZIP
    const selectedDocArray = filteredDocuments.filter((d) => selectedDocs.has(d.id));
    // TODO: Implement bulk download API
    console.log('Bulk download:', selectedDocArray);
  };

  // Filter documents by search
  const filteredDocuments = documents.filter((doc) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (doc.title?.toLowerCase().includes(query)) ||
      (doc.url?.toLowerCase().includes(query)) ||
      (doc.tags?.some((tag) => tag.toLowerCase().includes(query)))
    );
  });

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 rounded-lg p-6 text-center ${className}`}>
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700 dark:text-red-300">{error}</p>
        <button
          onClick={loadDocuments}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents found"
        description="This crawl hasn't discovered any documents yet. Documents will appear here as they're found."
        className={className}
      />
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg ${className}`}>
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left: Info and selection */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {filteredDocuments.length} documents found
            </span>
            {selectedDocs.size > 0 && (
              <span className="px-2 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                {selectedDocs.size} selected
              </span>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* View mode toggle */}
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
                title="Grid view"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Bulk actions */}
            {selectedDocs.size > 0 && (
              <button
                onClick={handleBulkDownload}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Selected
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'grid' ? (
        <div className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                isSelected={selectedDocs.has(doc.id)}
                onToggleSelect={() => toggleSelection(doc.id)}
                onPreview={() => handlePreview(doc)}
                onDownload={() => handleDownload(doc)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button onClick={selectAll} className="p-1">
                    {selectedDocs.size === filteredDocuments.length && filteredDocuments.length > 0 ? (
                      <CheckSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Document
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Size
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Quality
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc) => (
                <DocumentRow
                  key={doc.id}
                  document={doc}
                  isSelected={selectedDocs.has(doc.id)}
                  onToggleSelect={() => toggleSelection(doc.id)}
                  onPreview={() => handlePreview(doc)}
                  onDownload={() => handleDownload(doc)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default DocumentBrowser;
