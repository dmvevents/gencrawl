'use client'

import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import {
  BarChart3,
  Calendar,
  Database,
  FileText,
  History,
  LayoutGrid,
  Plug,
  Settings,
  Terminal,
  Sparkles,
  Zap,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Archive,
} from 'lucide-react'
import { sessionManager } from '@/lib/session/SessionManager'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { ConnectionStatus } from '@/components/ConnectionStatus'

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
  tab?: string
}

const primaryNav: NavItem[] = [
  { label: 'Command Center', href: '/dashboard', icon: Sparkles, tab: 'overview' },
  { label: 'Active Crawls', href: '/dashboard?tab=active', icon: Zap, tab: 'active' },
  { label: 'History', href: '/dashboard?tab=history', icon: History, tab: 'history' },
  { label: 'Logs', href: '/dashboard?tab=logs', icon: Terminal, tab: 'logs' },
  { label: 'Analytics', href: '/dashboard?tab=analytics', icon: BarChart3, tab: 'analytics' },
]

const opsNav: NavItem[] = [
  { label: 'Templates', href: '/dashboard/templates', icon: FileText },
  { label: 'Ingestion Gateway', href: '/dashboard/gateway', icon: Plug },
  { label: 'Ingestion', href: '/dashboard/ingestion', icon: Database },
  { label: 'Archive', href: '/dashboard/archive', icon: Archive },
  { label: 'Scheduler', href: '/dashboard/scheduler', icon: Calendar },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
]

function isActiveNav(
  pathname: string,
  activeTab: string,
  item: NavItem
): boolean {
  if (item.tab) {
    if (!pathname.startsWith('/dashboard')) {
      return false
    }
    return activeTab === item.tab || (item.tab === 'overview' && !activeTab)
  }

  return pathname.startsWith(item.href)
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || ''

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    sessionManager.getState('sidebarCollapsed', false)
  )
  const [darkMode, setDarkMode] = useState(() =>
    sessionManager.getState('darkMode', false)
  )

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && (darkMode || prefersDark))
    setDarkMode(shouldBeDark)

    if (shouldBeDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  useEffect(() => {
    sessionManager.saveState('sidebarCollapsed', sidebarCollapsed)
  }, [sidebarCollapsed])

  useEffect(() => {
    sessionManager.saveState('darkMode', darkMode)
  }, [darkMode])

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev
      if (next) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('theme', 'light')
      }
      return next
    })
  }

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev)
  }

  useKeyboardShortcuts({
    onToggleSidebar: toggleSidebar,
    onToggleDarkMode: toggleDarkMode,
  })

  const navSections = useMemo(
    () => [
      { label: 'Command', items: primaryNav },
      { label: 'Operations', items: opsNav },
    ],
    []
  )

  return (
    <div className="min-h-screen">
      <div className="flex">
        <aside
          className={`min-h-screen border-r border-[var(--gc-border)] bg-[var(--gc-surface)]/90 backdrop-blur-xl transition-all duration-300 ${
            sidebarCollapsed ? 'w-20' : 'w-72'
          }`}
        >
          <div className="flex items-center justify-between px-4 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--gc-accent),var(--gc-accent-strong))] text-white font-semibold">
                GC
              </div>
              {!sidebarCollapsed && (
                <div>
                  <p className="text-sm font-semibold text-[var(--gc-ink)] font-display">
                    GenCrawl
                  </p>
                  <p className="text-xs text-[var(--gc-muted)]">Command Suite</p>
                </div>
              )}
            </div>
            <button
              onClick={toggleSidebar}
              className="gc-icon-button"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>

          <nav className="px-3 pb-6">
            {navSections.map((section) => (
              <div key={section.label} className="mb-6">
                {!sidebarCollapsed && (
                  <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--gc-muted)]">
                    {section.label}
                  </p>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon
                    const active = isActiveNav(pathname, activeTab, item)

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-all ${
                          active
                            ? 'bg-[var(--gc-accent-soft)] text-[var(--gc-accent-strong)]'
                            : 'text-[var(--gc-muted)] hover:text-[var(--gc-ink)] hover:bg-[var(--gc-surface-muted)]'
                        }`}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        <Icon size={18} className={active ? 'text-[var(--gc-accent-strong)]' : ''} />
                        {!sidebarCollapsed && <span>{item.label}</span>}
                        {active && !sidebarCollapsed && (
                          <span className="ml-auto h-2 w-2 rounded-full bg-[var(--gc-accent)]" />
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>

          {!sidebarCollapsed && (
            <div className="px-6 pb-6">
              <div className="gc-panel-muted p-4 text-xs text-[var(--gc-muted)]">
                <p className="font-semibold text-[var(--gc-ink)]">AI-assisted crawling</p>
                <p className="mt-1">
                  Use prompts, templates, and schedules to extract web documents at scale.
                </p>
              </div>
            </div>
          )}
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-[var(--gc-border)] bg-[var(--gc-bg)]/70 backdrop-blur-xl">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--gc-border)] bg-[var(--gc-surface)] text-[var(--gc-muted)]">
                  <LayoutGrid size={18} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[var(--gc-muted)]">
                    Workspace
                  </p>
                  <p className="text-sm font-semibold text-[var(--gc-ink)] font-display">
                    GenCrawl Command Center
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={toggleDarkMode}
                  className="gc-icon-button"
                  aria-label="Toggle dark mode"
                >
                  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                <Link href="/dashboard" className="gc-button-secondary">
                  <Sparkles size={16} />
                  New Crawl
                </Link>
              </div>
            </div>
          </header>

          <main className="flex-1 px-6 py-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>

      <ConnectionStatus position="bottom-right" showDetails />
    </div>
  )
}
