'use client'

import type { ReactNode } from 'react'

export default function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className = '',
}: {
  title: string
  description?: string
  eyebrow?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-6 ${className}`}>
      <div>
        {eyebrow && (
          <p className="text-xs uppercase tracking-[0.28em] text-[var(--gc-muted)]">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 text-3xl font-semibold text-[var(--gc-ink)] font-display">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm text-[var(--gc-muted)]">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  )
}
