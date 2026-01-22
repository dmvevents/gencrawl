'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, FileText, CheckCircle, Clock, Award } from 'lucide-react'
import { crawlsApi, CrawlStatus, CrawlStats, ApiError } from '@/lib/api/client'

interface Metric {
  value: number
  change: number
  trend: number[]
}

interface LiveMetricsProps {
  crawlId?: string
}

export function LiveMetrics({ crawlId }: LiveMetricsProps) {
  const [metrics, setMetrics] = useState({
    pagesCrawled: { value: 0, change: 0, trend: [] as number[] },
    pagesTotal: { value: 0, change: 0, trend: [] as number[] },
    documentsFound: { value: 0, change: 0, trend: [] as number[] },
    successRate: { value: 0, change: 0, trend: [] as number[] },
    throughput: { value: 0, change: 0, trend: [] as number[] },
    avgQuality: { value: 0, change: 0, trend: [] as number[] },
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        let data: CrawlStatus | CrawlStats

        if (crawlId) {
          data = await crawlsApi.getStatus(crawlId) as CrawlStatus
        } else {
          data = await crawlsApi.getStats() as CrawlStats
        }

        setError(null)

        // Calculate metrics - handle both CrawlStatus and CrawlStats formats
        const statusData = data as any
        const pagesCrawled = statusData.progress?.crawled || statusData.total_urls_crawled || 0
        const pagesTotal = statusData.progress?.total || statusData.total_crawls || 0
        const documentsFound = statusData.documents_found || statusData.total_documents_found || 0
        const successRate = pagesCrawled > 0 && pagesTotal > 0 ? ((pagesCrawled / pagesTotal) * 100) : (statusData.average_success_rate || 0)
        const avgQuality = statusData.average_quality || statusData.average_quality_score || 0

        // Calculate throughput (pages per minute)
        const throughput = statusData.throughput || 0

        // Update trends (keep last 20 data points)
        const updateTrend = (current: Metric, newValue: number): Metric => {
          const newTrend = [...current.trend, newValue].slice(-20)
          const change = current.value > 0 ? ((newValue - current.value) / current.value) * 100 : 0
          return { value: newValue, change, trend: newTrend }
        }

        setMetrics(prev => ({
          pagesCrawled: updateTrend(prev.pagesCrawled, pagesCrawled),
          pagesTotal: updateTrend(prev.pagesTotal, pagesTotal),
          documentsFound: updateTrend(prev.documentsFound, documentsFound),
          successRate: updateTrend(prev.successRate, successRate),
          throughput: updateTrend(prev.throughput, throughput),
          avgQuality: updateTrend(prev.avgQuality, avgQuality),
        }))
      } catch (err) {
        console.error('Failed to fetch metrics:', err)
        if (err instanceof ApiError) {
          setError(err.message)
        }
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 2000)
    return () => clearInterval(interval)
  }, [crawlId])

  const MetricCard = ({
    title,
    value,
    icon: Icon,
    tone,
    suffix = '',
    trend,
  }: {
    title: string
    value: number
    icon: any
    tone: {
      border: string
      icon: string
      chip: string
      spark: string
      value: string
    }
    suffix?: string
    trend: number[]
  }) => {
    const maxValue = Math.max(...trend, 1)
    const sparklinePoints = trend.map((v, i) => {
      const x = (i / (trend.length - 1)) * 100
      const y = 100 - (v / maxValue) * 100
      return `${x},${y}`
    }).join(' ')

    return (
      <div className={`gc-panel p-6 border-l-4 ${tone.border}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-[var(--gc-muted)] mb-1">{title}</p>
            <p className={`text-3xl font-semibold ${tone.value}`}>
              {typeof value === 'number' ? value.toFixed(value % 1 === 0 ? 0 : 1) : value}
              {suffix}
            </p>
          </div>
          <div className={`p-3 rounded-xl ${tone.chip}`}>
            <Icon size={24} className={tone.icon} />
          </div>
        </div>

        {/* Sparkline */}
        {trend.length > 1 && (
          <div className="h-12 relative">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline
                points={sparklinePoints}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={tone.spark}
              />
              <polyline
                points={`0,100 ${sparklinePoints} 100,100`}
                fill="currentColor"
                opacity="0.1"
                className={tone.spark}
              />
            </svg>
          </div>
        )}
      </div>
    )
  }

  const tones = {
    info: {
      border: 'border-l-[color:var(--gc-accent)]',
      icon: 'text-[var(--gc-accent-strong)]',
      chip: 'bg-[var(--gc-accent-soft)]',
      spark: 'text-[var(--gc-accent)]',
      value: 'text-[var(--gc-ink)]',
    },
    success: {
      border: 'border-l-emerald-400',
      icon: 'text-emerald-600',
      chip: 'bg-emerald-500/10',
      spark: 'text-emerald-500',
      value: 'text-emerald-700',
    },
    warning: {
      border: 'border-l-amber-400',
      icon: 'text-amber-600',
      chip: 'bg-amber-500/10',
      spark: 'text-amber-500',
      value: 'text-amber-700',
    },
    violet: {
      border: 'border-l-violet-400',
      icon: 'text-violet-600',
      chip: 'bg-violet-500/10',
      spark: 'text-violet-500',
      value: 'text-violet-700',
    },
    cyan: {
      border: 'border-l-sky-400',
      icon: 'text-sky-600',
      chip: 'bg-sky-500/10',
      spark: 'text-sky-500',
      value: 'text-sky-700',
    },
    neutral: {
      border: 'border-l-slate-300',
      icon: 'text-slate-600',
      chip: 'bg-slate-500/10',
      spark: 'text-slate-500',
      value: 'text-[var(--gc-ink)]',
    },
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <MetricCard
        title="Pages Crawled"
        value={metrics.pagesCrawled.value}
        icon={FileText}
        tone={tones.info}
        suffix={` / ${metrics.pagesTotal.value}`}
        trend={metrics.pagesCrawled.trend}
      />

      <MetricCard
        title="Documents Found"
        value={metrics.documentsFound.value}
        icon={Award}
        tone={tones.violet}
        trend={metrics.documentsFound.trend}
      />

      <MetricCard
        title="Success Rate"
        value={metrics.successRate.value}
        icon={CheckCircle}
        tone={tones.success}
        suffix="%"
        trend={metrics.successRate.trend}
      />

      <MetricCard
        title="Throughput"
        value={metrics.throughput.value}
        icon={TrendingUp}
        tone={tones.warning}
        suffix=" pages/min"
        trend={metrics.throughput.trend}
      />

      <MetricCard
        title="Avg Quality Score"
        value={metrics.avgQuality.value}
        icon={Award}
        tone={tones.cyan}
        suffix="%"
        trend={metrics.avgQuality.trend}
      />

      <MetricCard
        title="Active Time"
        value={Math.floor(metrics.pagesCrawled.trend.length / 30)}
        icon={Clock}
        tone={tones.neutral}
        suffix=" min"
        trend={metrics.pagesCrawled.trend.map((_, i) => i)}
      />
    </div>
  )
}
