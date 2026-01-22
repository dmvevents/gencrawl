'use client'

import { useEffect, useState } from 'react'
import { Activity, Database, Server, Zap, AlertCircle, Loader2 } from 'lucide-react'
import { healthApi, HealthResponse, ApiError } from '@/lib/api/client'

export function SystemHealth() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await healthApi.check()
        setHealth(data)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch health:', err)
        if (err instanceof ApiError) {
          setError(err.message)
        } else {
          setError('Unable to connect to server')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchHealth()
    const interval = setInterval(fetchHealth, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="gc-panel p-6 h-full">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--gc-ink)] font-display">System Health</h2>
          <span className="gc-pill">Live</span>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="gc-panel-muted p-5 animate-pulse">
              <div className="w-12 h-12 bg-[color:var(--gc-border)]/60 rounded-xl mb-4" />
              <div className="h-3 bg-[color:var(--gc-border)]/60 rounded w-16 mb-2" />
              <div className="h-6 bg-[color:var(--gc-border)]/80 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gc-panel p-6 h-full">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--gc-ink)] font-display">System Health</h2>
          <span className="gc-pill">Live</span>
        </div>
        <div className="mt-4 gc-panel-muted border-l-4 border-l-rose-400 p-4">
          <div className="flex items-center gap-2 text-rose-600">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      </div>
    )
  }

  const services = [
    { name: 'API', status: health?.services?.api, icon: Activity },
    { name: 'Database', status: health?.services?.database, icon: Database },
    { name: 'Redis', status: health?.services?.redis, icon: Server },
    { name: 'Weaviate', status: health?.services?.weaviate, icon: Zap },
  ]

  return (
    <div className="gc-panel p-6 h-full">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--gc-ink)] font-display">System Health</h2>
        <span className="gc-pill">Live</span>
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        {services.map((service) => (
          <div key={service.name} className="gc-panel-muted p-5">
            <div className={`inline-flex p-3 rounded-xl mb-4 ${
              service.status === 'up'
                ? 'bg-emerald-500/10 text-emerald-600'
                : 'bg-rose-500/10 text-rose-600'
            }`}>
              <service.icon size={24} />
            </div>
            <h3 className="text-xs uppercase tracking-wider text-[var(--gc-muted)]">{service.name}</h3>
            <p className="text-xl font-semibold text-[var(--gc-ink)]">
              {service.status === 'up' ? 'Healthy' : 'Down'}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
