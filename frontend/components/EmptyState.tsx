'use client'

/**
 * Empty State Component
 *
 * Displays a helpful empty state with icon, title, description, and optional action.
 * Used throughout the dashboard when no data is available.
 */

import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-4 ${className}`}
    >
      {/* Icon container */}
      <div className="w-20 h-20 bg-[var(--gc-surface-muted)] rounded-full flex items-center justify-center mb-4">
        <Icon className="w-10 h-10 text-[var(--gc-muted)]" />
      </div>

      {/* Title */}
      <h3 className="text-xl font-semibold text-[var(--gc-ink)] mb-2 text-center">
        {title}
      </h3>

      {/* Description */}
      <p className="text-[var(--gc-muted)] text-center max-w-md mb-6">
        {description}
      </p>

      {/* Action button */}
      {action && (
        <button
          onClick={action.onClick}
          className="gc-button"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

/**
 * Compact empty state for smaller containers
 */
export function EmptyStateCompact({
  icon: Icon,
  title,
  description,
  className = '',
}: Omit<EmptyStateProps, 'action'>) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-8 px-4 ${className}`}
    >
      <Icon className="w-8 h-8 text-[var(--gc-muted)] mb-2" />
      <p className="text-sm font-medium text-[var(--gc-muted)] text-center">
        {title}
      </p>
      {description && (
        <p className="text-xs text-[var(--gc-muted)] text-center mt-1">
          {description}
        </p>
      )}
    </div>
  )
}

/**
 * Empty state for table rows
 */
export function EmptyTableRow({
  colSpan,
  icon: Icon,
  message,
}: {
  colSpan: number
  icon: LucideIcon
  message: string
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="px-6 py-12 text-center text-[var(--gc-muted)]"
      >
        <div className="flex flex-col items-center">
          <Icon className="w-8 h-8 text-[var(--gc-muted)] mb-2" />
          <span>{message}</span>
        </div>
      </td>
    </tr>
  )
}

export default EmptyState
