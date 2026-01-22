'use client';

/**
 * Job Overview Component
 *
 * Displays a summary overview of a crawl job with:
 * - Key metrics
 * - Configuration summary
 * - Targets list
 * - Quick actions
 */

import {
  Globe,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Target,
  Settings,
  Zap,
  BarChart2,
} from 'lucide-react';
import { CrawlFullData } from '@/lib/api/client';

interface JobOverviewProps {
  job: CrawlFullData;
  className?: string;
}

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return 'N/A';
  return new Date(isoString).toLocaleString();
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return 'N/A';
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

function MetricCard({
  icon: Icon,
  label,
  value,
  subValue,
  color = 'blue',
}: {
  icon: typeof Globe;
  label: string;
  value: string | number;
  subValue?: string;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    gray: 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subValue && (
            <p className="text-xs text-gray-400 dark:text-gray-500">{subValue}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function JobOverview({ job, className = '' }: JobOverviewProps) {
  const config = job.config || {};
  const metrics = job.metrics || {};

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={Globe}
          label="URLs Crawled"
          value={job.urls_crawled}
          subValue={`${job.urls_failed} failed`}
          color="blue"
        />
        <MetricCard
          icon={FileText}
          label="Documents Found"
          value={job.documents_found}
          color="purple"
        />
        <MetricCard
          icon={CheckCircle}
          label="Success Rate"
          value={`${Math.round(job.success_rate * 100)}%`}
          color={job.success_rate >= 0.8 ? 'green' : job.success_rate >= 0.6 ? 'yellow' : 'red'}
        />
        <MetricCard
          icon={BarChart2}
          label="Quality Score"
          value={`${Math.round(job.quality_score * 100)}%`}
          color={job.quality_score >= 0.8 ? 'green' : job.quality_score >= 0.6 ? 'yellow' : 'red'}
        />
      </div>

      {/* Time Information */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-400" />
          Timeline
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Started</p>
            <p className="text-gray-900 dark:text-white font-medium">
              {formatDate(job.started_at)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
            <p className="text-gray-900 dark:text-white font-medium">
              {formatDate(job.completed_at)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Duration</p>
            <p className="text-gray-900 dark:text-white font-medium">
              {formatDuration(job.duration_seconds)}
            </p>
          </div>
        </div>
      </div>

      {/* Query and Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Query */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-gray-400" />
            Query
          </h3>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <p className="text-gray-900 dark:text-white">
              {config.original_query || job.query || 'No query specified'}
            </p>
          </div>
        </div>

        {/* Targets */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-gray-400" />
            Targets ({job.targets?.length || 0})
          </h3>
          {job.targets && job.targets.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {job.targets.map((target, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                    {target}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No targets specified
            </p>
          )}
        </div>
      </div>

      {/* Configuration Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-400" />
          Configuration
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Crawler
            </p>
            <p className="text-gray-900 dark:text-white font-medium mt-1">
              {config.crawler || 'Scrapy'}
            </p>
          </div>
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Max Depth
            </p>
            <p className="text-gray-900 dark:text-white font-medium mt-1">
              {config.max_depth ?? 3}
            </p>
          </div>
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Max Pages
            </p>
            <p className="text-gray-900 dark:text-white font-medium mt-1">
              {config.max_pages ?? 100}
            </p>
          </div>
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Output Format
            </p>
            <p className="text-gray-900 dark:text-white font-medium mt-1 uppercase">
              {config.output_format || 'JSONL'}
            </p>
          </div>
        </div>

        {/* Document types */}
        {config.document_types && config.document_types.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Document Types
            </p>
            <div className="flex flex-wrap gap-2">
              {config.document_types.map((type: string) => (
                <span
                  key={type}
                  className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded"
                >
                  {type.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Performance Metrics */}
      {metrics && Object.keys(metrics).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-gray-400" />
            Performance Metrics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.throughput !== undefined && (
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {typeof metrics.throughput === 'number'
                    ? metrics.throughput.toFixed(2)
                    : metrics.throughput}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Pages/second
                </p>
              </div>
            )}
            {metrics.avg_response_time !== undefined && (
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {typeof metrics.avg_response_time === 'number'
                    ? `${Math.round(metrics.avg_response_time)}ms`
                    : metrics.avg_response_time}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Avg Response Time
                </p>
              </div>
            )}
            {metrics.total_bytes !== undefined && (
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {typeof metrics.total_bytes === 'number'
                    ? `${(metrics.total_bytes / (1024 * 1024)).toFixed(1)} MB`
                    : metrics.total_bytes}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Data Downloaded
                </p>
              </div>
            )}
            {metrics.error_rate !== undefined && (
              <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {typeof metrics.error_rate === 'number'
                    ? `${(metrics.error_rate * 100).toFixed(1)}%`
                    : metrics.error_rate}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Error Rate
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default JobOverview;
