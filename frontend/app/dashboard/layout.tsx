import { Suspense } from 'react'
import DashboardShell from '@/components/layout/DashboardShell'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="px-6 py-12 text-[var(--gc-muted)]">Loading workspace...</div>}>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  )
}
