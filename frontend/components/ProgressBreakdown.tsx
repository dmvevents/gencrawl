'use client';

/**
 * Progress Breakdown Component
 *
 * Displays multi-phase progress bars for crawl stages:
 * - URLs crawled
 * - Documents found
 * - Extractions completed
 * - Processing completed
 */

import { Globe, FileText, Cpu, CheckCircle } from 'lucide-react';

interface ProgressData {
  total: number;
  completed: number;
  failed?: number;
  percentage?: number;
}

interface ProgressBreakdownProps {
  progress: {
    urls?: ProgressData;
    documents?: ProgressData;
    extractions?: ProgressData;
    processing?: ProgressData;
    overall_percentage?: number;
  };
  className?: string;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

interface ProgressBarProps {
  label: string;
  icon: typeof Globe;
  completed: number;
  total: number;
  failed?: number;
  color: string;
  bgColor: string;
}

function ProgressBar({
  label,
  icon: Icon,
  completed,
  total,
  failed = 0,
  color,
  bgColor,
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const failedPercentage = total > 0 ? Math.round((failed / total) * 100) : 0;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            {formatNumber(completed)} / {formatNumber(total)}
          </span>
          <span className={`font-medium ${color}`}>
            {percentage}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        {/* Success portion */}
        <div
          className={`absolute left-0 top-0 h-full ${bgColor} transition-all duration-300`}
          style={{ width: `${Math.max(percentage - failedPercentage, 0)}%` }}
        />
        {/* Failed portion */}
        {failed > 0 && (
          <div
            className="absolute top-0 h-full bg-red-500 transition-all duration-300"
            style={{
              left: `${Math.max(percentage - failedPercentage, 0)}%`,
              width: `${failedPercentage}%`,
            }}
          />
        )}
      </div>

      {/* Failed count */}
      {failed > 0 && (
        <div className="text-xs text-red-500 dark:text-red-400">
          {formatNumber(failed)} failed
        </div>
      )}
    </div>
  );
}

export function ProgressBreakdown({ progress, className = '' }: ProgressBreakdownProps) {
  const overallPercentage = progress.overall_percentage ?? 0;

  const stages = [
    {
      key: 'urls',
      label: 'URLs Crawled',
      icon: Globe,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500',
      data: progress.urls,
    },
    {
      key: 'documents',
      label: 'Documents Found',
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500',
      data: progress.documents,
    },
    {
      key: 'extractions',
      label: 'Extractions',
      icon: Cpu,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-500',
      data: progress.extractions,
    },
    {
      key: 'processing',
      label: 'Processing',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-500',
      data: progress.processing,
    },
  ];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Progress Breakdown
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Overall:</span>
          <span className={`text-2xl font-bold ${
            overallPercentage >= 100
              ? 'text-green-600'
              : overallPercentage >= 50
              ? 'text-blue-600'
              : 'text-gray-900 dark:text-white'
          }`}>
            {Math.round(overallPercentage)}%
          </span>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="mb-8">
        <div className="h-4 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              overallPercentage >= 100
                ? 'bg-green-500'
                : 'bg-gradient-to-r from-blue-500 via-purple-500 to-green-500'
            }`}
            style={{ width: `${Math.min(overallPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Individual stage progress */}
      <div className="space-y-6">
        {stages.map((stage) => {
          if (!stage.data) return null;

          return (
            <ProgressBar
              key={stage.key}
              label={stage.label}
              icon={stage.icon}
              completed={stage.data.completed}
              total={stage.data.total}
              failed={stage.data.failed}
              color={stage.color}
              bgColor={stage.bgColor}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Compact progress indicator
 */
export function ProgressIndicator({
  completed,
  total,
  label,
  className = '',
}: {
  completed: number;
  total: number;
  label?: string;
  className?: string;
}) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 min-w-[4rem] text-right">
        {label || `${percentage}%`}
      </span>
    </div>
  );
}

export default ProgressBreakdown;
