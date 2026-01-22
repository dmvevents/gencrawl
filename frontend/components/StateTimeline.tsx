'use client';

/**
 * State Timeline Component
 *
 * Displays a visual timeline of crawl state transitions with:
 * - Horizontal timeline with state nodes
 * - Duration bars
 * - Active/completed state indicators
 */

import { Check, Clock, AlertCircle, Pause, X } from 'lucide-react';

interface StateTransition {
  from_state: string;
  to_state: string;
  timestamp: string;
  duration_seconds?: number;
  metadata?: Record<string, unknown>;
}

interface StateTimelineProps {
  stateHistory: StateTransition[];
  className?: string;
}

// State configuration
const stateConfig: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  icon: typeof Check;
}> = {
  queued: {
    label: 'Queued',
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-700',
    icon: Clock,
  },
  initializing: {
    label: 'Initializing',
    color: 'text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: Clock,
  },
  crawling: {
    label: 'Crawling',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: Clock,
  },
  extracting: {
    label: 'Extracting',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: Clock,
  },
  processing: {
    label: 'Processing',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: Clock,
  },
  completed: {
    label: 'Completed',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: Check,
  },
  failed: {
    label: 'Failed',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: AlertCircle,
  },
  paused: {
    label: 'Paused',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: Pause,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-700',
    icon: X,
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

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function StateTimeline({ stateHistory, className = '' }: StateTimelineProps) {
  if (!stateHistory || stateHistory.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 ${className}`}>
        <p className="text-gray-500 dark:text-gray-400 text-center">
          No state history available
        </p>
      </div>
    );
  }

  // Get unique states from transitions
  const states: Array<{
    state: string;
    timestamp: string;
    duration?: number;
    isActive: boolean;
    isCompleted: boolean;
  }> = [];

  stateHistory.forEach((transition, index) => {
    // Add to_state
    const isLast = index === stateHistory.length - 1;
    states.push({
      state: transition.to_state,
      timestamp: transition.timestamp,
      duration: transition.duration_seconds,
      isActive: isLast,
      isCompleted: !isLast,
    });
  });

  // Calculate total duration
  const totalDuration = states.reduce((sum, s) => sum + (s.duration || 0), 0);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
        State Timeline
      </h3>

      {/* Horizontal timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700" />

        {/* State nodes */}
        <div className="flex justify-between relative">
          {states.map((item, index) => {
            const config = stateConfig[item.state] || stateConfig.queued;
            const Icon = config.icon;

            return (
              <div
                key={`${item.state}-${index}`}
                className="flex flex-col items-center"
                style={{ width: `${100 / states.length}%` }}
              >
                {/* Node */}
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center
                    ${item.isCompleted ? 'bg-green-500' : config.bgColor}
                    ${item.isActive ? 'ring-4 ring-blue-200 dark:ring-blue-800' : ''}
                    transition-all duration-300 z-10
                  `}
                >
                  {item.isCompleted ? (
                    <Check className="w-6 h-6 text-white" />
                  ) : (
                    <Icon className={`w-6 h-6 ${config.color}`} />
                  )}
                </div>

                {/* Label */}
                <div className="mt-3 text-center">
                  <p className={`text-sm font-medium ${
                    item.isActive
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {config.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatTime(item.timestamp)}
                  </p>
                  {item.duration !== undefined && item.duration > 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {formatDuration(item.duration)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Duration breakdown bars */}
      {totalDuration > 0 && (
        <div className="mt-8">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Duration Breakdown
          </h4>
          <div className="flex h-4 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700">
            {states.map((item, index) => {
              if (!item.duration || item.duration <= 0) return null;

              const config = stateConfig[item.state] || stateConfig.queued;
              const percentage = (item.duration / totalDuration) * 100;

              return (
                <div
                  key={`bar-${item.state}-${index}`}
                  className={`${config.bgColor} ${config.color} flex items-center justify-center text-xs font-medium`}
                  style={{ width: `${percentage}%` }}
                  title={`${config.label}: ${formatDuration(item.duration)}`}
                >
                  {percentage > 10 && formatDuration(item.duration)}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-3">
            {states.map((item, index) => {
              if (!item.duration || item.duration <= 0) return null;

              const config = stateConfig[item.state] || stateConfig.queued;
              const percentage = Math.round((item.duration / totalDuration) * 100);

              return (
                <div
                  key={`legend-${item.state}-${index}`}
                  className="flex items-center gap-2 text-xs"
                >
                  <div className={`w-3 h-3 rounded ${config.bgColor}`} />
                  <span className="text-gray-600 dark:text-gray-400">
                    {config.label}: {percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Total duration */}
      {totalDuration > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Total Duration: <span className="font-medium text-gray-900 dark:text-white">
              {formatDuration(totalDuration)}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

export default StateTimeline;
