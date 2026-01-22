'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Download } from 'lucide-react'
import { API_BASE } from '@/lib/api/config'

interface AnalyticsData {
  progressOverTime: Array<{ time: string; pages: number; documents: number }>
  documentsByType: Array<{ type: string; count: number }>
  documentsBySource: Array<{ source: string; count: number }>
  qualityDistribution: Array<{ range: string; count: number }>
}

interface AnalyticsProps {
  crawlId?: string
}

const COLORS = ['#0f766e', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#22c1b8']

export function Analytics({ crawlId }: AnalyticsProps) {
  const [data, setData] = useState<AnalyticsData>({
    progressOverTime: [],
    documentsByType: [],
    documentsBySource: [],
    qualityDistribution: [],
  })

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const endpoint = crawlId
          ? `${API_BASE}/crawl/${crawlId}/analytics`
          : `${API_BASE}/analytics/overview`

        const res = await fetch(endpoint)
        const analytics = await res.json()

        setData({
          progressOverTime: analytics.progress_over_time || [],
          documentsByType: analytics.documents_by_type || [],
          documentsBySource: analytics.documents_by_source || [],
          qualityDistribution: analytics.quality_distribution || [],
        })
      } catch (err) {
        console.error('Failed to fetch analytics:', err)
      }
    }

    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, 5000)
    return () => clearInterval(interval)
  }, [crawlId])

  const exportToCSV = () => {
    const csvData = [
      ['Time', 'Pages', 'Documents'],
      ...data.progressOverTime.map(d => [d.time, d.pages, d.documents]),
    ]

    const csv = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `analytics-${crawlId || 'all'}-${new Date().toISOString()}.csv`
    link.click()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--gc-ink)] font-display">Analytics</h2>
        <button onClick={exportToCSV} className="gc-button">
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Progress Over Time */}
      <div className="gc-panel p-6">
        <h3 className="text-base font-semibold mb-4 text-[var(--gc-ink)]">Crawl Progress Over Time</h3>
        {data.progressOverTime.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-[var(--gc-muted)]">
            No progress data available yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.progressOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gc-border)" />
              <XAxis dataKey="time" stroke="var(--gc-muted)" />
              <YAxis stroke="var(--gc-muted)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--gc-surface)',
                  border: '1px solid var(--gc-border)',
                  borderRadius: '12px',
                  color: 'var(--gc-ink)',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="pages"
                stroke="var(--gc-accent)"
                strokeWidth={2}
                name="Pages Crawled"
              />
              <Line
                type="monotone"
                dataKey="documents"
                stroke="#10b981"
                strokeWidth={2}
                name="Documents Found"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documents by Type */}
        <div className="gc-panel p-6">
          <h3 className="text-base font-semibold mb-4 text-[var(--gc-ink)]">Documents by Type</h3>
          {data.documentsByType.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-[var(--gc-muted)]">
              No documents found yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.documentsByType}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => `${entry.type}: ${entry.count}`}
                >
                  {data.documentsByType.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--gc-surface)',
                    border: '1px solid var(--gc-border)',
                    borderRadius: '12px',
                    color: 'var(--gc-ink)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Documents by Source */}
        <div className="gc-panel p-6">
          <h3 className="text-base font-semibold mb-4 text-[var(--gc-ink)]">Documents by Source</h3>
          {data.documentsBySource.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-[var(--gc-muted)]">
              No source data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.documentsBySource}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gc-border)" />
                <XAxis dataKey="source" stroke="var(--gc-muted)" />
                <YAxis stroke="var(--gc-muted)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--gc-surface)',
                    border: '1px solid var(--gc-border)',
                    borderRadius: '12px',
                    color: 'var(--gc-ink)',
                  }}
                />
                <Bar dataKey="count" fill="var(--gc-accent)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Quality Distribution */}
      <div className="gc-panel p-6">
        <h3 className="text-base font-semibold mb-4 text-[var(--gc-ink)]">Quality Score Distribution</h3>
        {data.qualityDistribution.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-[var(--gc-muted)]">
            No quality data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.qualityDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gc-border)" />
              <XAxis dataKey="range" stroke="var(--gc-muted)" />
              <YAxis stroke="var(--gc-muted)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--gc-surface)',
                  border: '1px solid var(--gc-border)',
                  borderRadius: '12px',
                  color: 'var(--gc-ink)',
                }}
              />
              <Bar dataKey="count" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
