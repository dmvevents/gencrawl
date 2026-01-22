'use client';

/**
 * Job Header Component
 *
 * Displays the header section for a job detail page with:
 * - Job title/query
 * - Status badge
 * - Action buttons (rerun, download, delete, pause/resume)
 * - Key metrics summary
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Download,
  Trash2,
  ExternalLink,
  Clock,
  FileText,
  Globe,
  CheckCircle,
  AlertCircle,
  Loader2,
  XCircle,
} from 'lucide-react';
import { CrawlFullData } from '@/lib/api/client';
import { showToast } from '@/lib/toast';

interface JobHeaderProps {
  job: CrawlFullData;
  onRerun?: () => Promise<void>;
  onDownload?: (format: 'json' | 'jsonl' | 'csv') => Promise<void>;
  onDelete?: () => Promise<void>;
  onPause?: () => Promise<void>;
  onResume?: () => Promise<void>;
  onCancel?: () => Promise<void>;
  className?: string;
}

// Status configuration
const statusConfig: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  icon: typeof CheckCircle;
}> = {
  completed: {
    label: 'Completed',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: CheckCircle,
  },
  running: {
    label: 'Running',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: Loader2,
  },
  crawling: {
    label: 'Crawling',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: Loader2,
  },
  extracting: {
    label: 'Extracting',
    color: 'text-purple-700 dark:text-purple-300',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: Loader2,
  },
  processing: {
    label: 'Processing',
    color: 'text-yellow-700 dark:text-yellow-300',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: Loader2,
  },
  failed: {
    label: 'Failed',
    color: 'text-red-700 dark:text-red-300',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: AlertCircle,
  },
  paused: {
    label: 'Paused',
    color: 'text-orange-700 dark:text-orange-300',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: Pause,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-700',
    icon: XCircle,
  },
  queued: {
    label: 'Queued',
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-700',
    icon: Clock,
  },
};

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString();
}

export function JobHeader({
  job,
  onRerun,
  onDownload,
  onDelete,
  onPause,
  onResume,
  onCancel,
  className = '',
}: JobHeaderProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const status = statusConfig[job.status] || statusConfig.queued;
  const StatusIcon = status.icon;
  const isRunning = ['running', 'crawling', 'extracting', 'processing', 'initializing'].includes(job.status);
  const isPaused = job.status === 'paused';
  const isTerminal = ['completed', 'failed', 'cancelled'].includes(job.status);

  const handleAction = async (action: string, handler?: () => Promise<void>) => {
    if (!handler) return;
    setIsLoading(action);
    try {
      await handler();
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
      showToast.error(`Failed to ${action}`);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg ${className}`}>
      {/* Breadcrumb */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex items-center gap-2 text-sm">
          <Link
            href="/dashboard"
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            Dashboard
          </Link>
          <span className="text-gray-400">/</span>
          <Link
            href="/dashboard?tab=history"
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            History
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900 dark:text-white font-medium truncate max-w-[200px]">
            {job.config?.original_query?.slice(0, 50) || job.crawl_id.slice(0, 8)}
          </span>
        </nav>
      </div>

      {/* Main header */}
      <div className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          {/* Left: Title and info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-4">
              <Link
                href="/dashboard?tab=history"
                className="mt-1 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>

              <div className="flex-1 min-w-0">
                {/* Status badge */}
                <div className="flex items-center gap-3 mb-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full ${status.bgColor} ${status.color}`}>
                    <StatusIcon className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
                    {status.label}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ID: {job.crawl_id.slice(0, 8)}...
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 truncate">
                  {job.config?.original_query || job.query || 'Untitled Crawl'}
                </h1>

                {/* Timestamps */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                  {job.started_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Started: {formatDate(job.started_at)}
                    </span>
                  )}
                  {job.duration_seconds && (
                    <span>Duration: {formatDuration(job.duration_seconds)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Pause/Resume for running jobs */}
            {isRunning && onPause && (
              <button
                onClick={() => handleAction('pause', onPause)}
                disabled={isLoading !== null}
                className="px-4 py-2 flex items-center gap-2 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors disabled:opacity-50"
              >
                {isLoading === 'pause' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                Pause
              </button>
            )}

            {isPaused && onResume && (
              <button
                onClick={() => handleAction('resume', onResume)}
                disabled={isLoading !== null}
                className="px-4 py-2 flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50"
              >
                {isLoading === 'resume' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Resume
              </button>
            )}

            {/* Cancel for non-terminal jobs */}
            {!isTerminal && onCancel && (
              <button
                onClick={() => handleAction('cancel', onCancel)}
                disabled={isLoading !== null}
                className="px-4 py-2 flex items-center gap-2 text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                {isLoading === 'cancel' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Cancel
              </button>
            )}

            {/* Rerun */}
            {onRerun && (
              <button
                onClick={() => handleAction('rerun', onRerun)}
                disabled={isLoading !== null}
                className="px-4 py-2 flex items-center gap-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
              >
                {isLoading === 'rerun' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Re-run
              </button>
            )}

            {/* Download */}
            {onDownload && (
              <div className="relative group">
                <button
                  disabled={isLoading !== null}
                  className="px-4 py-2 flex items-center gap-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <div className="absolute top-full mt-1 right-0 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[120px] z-10">
                  <button
                    onClick={() => handleAction('download', () => onDownload('json'))}
                    className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => handleAction('download', () => onDownload('jsonl'))}
                    className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    JSONL
                  </button>
                  <button
                    onClick={() => handleAction('download', () => onDownload('csv'))}
                    className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    CSV
                  </button>
                </div>
              </div>
            )}

            {/* Delete */}
            {onDelete && (
              <button
                onClick={() => handleAction('delete', onDelete)}
                disabled={isLoading !== null}
                className="px-4 py-2 flex items-center gap-2 text-red-600 dark:text-red-400 bg-white dark:bg-gray-700 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                {isLoading === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {job.urls_crawled}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
              <Globe className="w-4 h-4" />
              URLs Crawled
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {job.documents_found}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
              <FileText className="w-4 h-4" />
              Documents Found
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.round(job.success_rate * 100)}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
              <CheckCircle className="w-4 h-4" />
              Success Rate
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.round(job.quality_score * 100)}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Quality Score
            </div>
          </div>
        </div>

        {/* Error message if failed */}
        {job.error_message && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-300">Error</p>
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                  {job.error_message}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default JobHeader;
