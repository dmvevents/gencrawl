# Component Usage Guide

Quick reference for using the monitoring dashboard components.

## LogViewer

```tsx
import { LogViewer } from '@/components/LogViewer'

// Show all logs with auto-scroll
<LogViewer autoScroll={true} />

// Filter to specific crawl
<LogViewer crawlId="crawl-123" autoScroll={true} />

// Disable auto-scroll for manual browsing
<LogViewer crawlId="crawl-123" autoScroll={false} />
```

**Features**:
- Search across all fields
- Filter by event type
- Export to JSON
- Color-coded by event type
- Auto-scroll to latest

---

## CrawlerStateFlow

```tsx
import { CrawlerStateFlow } from '@/components/CrawlerStateFlow'

// Monitor specific crawl's state progression
<CrawlerStateFlow crawlId="crawl-123" />
```

**Shows**:
- Current state in pipeline (queued → running → extracting → processing → completed)
- Progress bar during crawling
- Documents found and quality score
- Elapsed time
- Estimated time per stage

---

## LiveMetrics

```tsx
import { LiveMetrics } from '@/components/LiveMetrics'

// All crawls metrics
<LiveMetrics />

// Specific crawl metrics
<LiveMetrics crawlId="crawl-123" />
```

**Metrics**:
- Pages crawled
- Documents found
- Success rate
- Throughput (pages/min)
- Average quality score
- Active time

**Features**:
- Sparkline trends (last 20 data points)
- Real-time updates every 2s
- Responsive grid layout

---

## DocumentFeed

```tsx
import { DocumentFeed } from '@/components/DocumentFeed'

// Recent documents from all crawls
<DocumentFeed limit={10} />

// Documents from specific crawl
<DocumentFeed crawlId="crawl-123" />

// All documents from specific crawl (no limit)
<DocumentFeed crawlId="crawl-123" limit={undefined} />
```

**Features**:
- Live feed of discoveries
- Tag filtering
- Download buttons
- Quality score indicators
- File type icons
- Metadata badges (subject, exam type, year)

---

## Analytics

```tsx
import { Analytics } from '@/components/Analytics'

// Overview of all crawls
<Analytics />

// Analytics for specific crawl
<Analytics crawlId="crawl-123" />
```

**Charts**:
1. Progress over time (line)
2. Documents by type (pie)
3. Documents by source (bar)
4. Quality distribution (histogram)

**Features**:
- Export to CSV
- Dark mode compatible
- Auto-refresh every 5s

---

## ErrorTracker

```tsx
import { ErrorTracker } from '@/components/ErrorTracker'

// All errors across system
<ErrorTracker />

// Errors for specific crawl
<ErrorTracker crawlId="crawl-123" />
```

**Features**:
- Grouped by error type
- Expandable stack traces
- Retry functionality (single or batch)
- Frequency counts
- Color-coded severity

---

## Complete Dashboard Example

```tsx
'use client'

import { useState } from 'react'
import { LogViewer } from '@/components/LogViewer'
import { CrawlerStateFlow } from '@/components/CrawlerStateFlow'
import { LiveMetrics } from '@/components/LiveMetrics'
import { DocumentFeed } from '@/components/DocumentFeed'
import { Analytics } from '@/components/Analytics'
import { ErrorTracker } from '@/components/ErrorTracker'

export default function MyDashboard() {
  const [selectedCrawl, setSelectedCrawl] = useState<string>('crawl-123')

  return (
    <div className="space-y-8">
      {/* State Machine */}
      <CrawlerStateFlow crawlId={selectedCrawl} />

      {/* Key Metrics */}
      <LiveMetrics crawlId={selectedCrawl} />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Documents */}
        <DocumentFeed crawlId={selectedCrawl} />

        {/* Logs */}
        <LogViewer crawlId={selectedCrawl} autoScroll={true} />
      </div>

      {/* Analytics */}
      <Analytics crawlId={selectedCrawl} />

      {/* Errors */}
      <ErrorTracker crawlId={selectedCrawl} />
    </div>
  )
}
```

---

## Styling Tips

### Dark Mode
All components support dark mode. Toggle with:

```tsx
// Add to your root component
const [darkMode, setDarkMode] = useState(false)

useEffect(() => {
  if (darkMode) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}, [darkMode])

<button onClick={() => setDarkMode(!darkMode)}>
  {darkMode ? 'Light' : 'Dark'} Mode
</button>
```

### Custom Styling
All components use Tailwind classes. Override with:

```tsx
<div className="max-w-4xl mx-auto">
  <LogViewer crawlId="crawl-123" />
</div>
```

### Responsive Layout
```tsx
{/* Mobile: 1 column, Desktop: 2 columns */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <DocumentFeed crawlId={crawlId} />
  <ErrorTracker crawlId={crawlId} />
</div>

{/* Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <LiveMetrics crawlId={crawlId} />
</div>
```

---

## Event Types Reference

For `LogViewer` filtering:

| Event Type | Color | Description |
|------------|-------|-------------|
| `crawl_start` | Blue | Crawl job initiated |
| `page_crawled` | Green | Page successfully crawled |
| `page_failed` | Red | Page crawl failed |
| `document_found` | Purple | Document discovered |
| `extraction` | Yellow | Extracting content |
| `quality_check` | Cyan | Quality analysis |
| `error` | Red | Error occurred |

---

## State Machine Reference

For `CrawlerStateFlow`:

| State | Duration | Description |
|-------|----------|-------------|
| `queued` | ~5s | Waiting in queue |
| `running` | ~120s | Crawling pages |
| `extracting` | ~30s | Processing content |
| `processing` | ~15s | Finalizing data |
| `completed` | - | Successfully finished |
| `failed` | - | Error occurred |

---

## Performance Tips

1. **Use crawlId filtering** when possible to reduce data volume
2. **Set reasonable limits** on DocumentFeed (e.g., 10-50 items)
3. **Disable auto-scroll** in LogViewer for manual browsing
4. **Use tabs** to show/hide expensive components
5. **Lazy load** Analytics charts when tab is active

Example lazy loading:

```tsx
const [activeTab, setActiveTab] = useState('overview')

{activeTab === 'analytics' && (
  <Analytics crawlId={selectedCrawl} />
)}
```

---

## Common Patterns

### Loading States
```tsx
const [loading, setLoading] = useState(true)

{loading ? (
  <div className="animate-pulse">
    <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
    <div className="h-64 bg-gray-200 rounded"></div>
  </div>
) : (
  <Analytics crawlId={crawlId} />
)}
```

### Empty States
```tsx
{documents.length === 0 ? (
  <div className="text-center py-8 text-gray-500">
    No documents found yet. They will appear here as crawl progresses.
  </div>
) : (
  <DocumentFeed crawlId={crawlId} />
)}
```

### Error Handling
```tsx
try {
  const res = await fetch(`/api/v1/crawl/${crawlId}/status`)
  if (!res.ok) throw new Error('Failed to fetch')
  const data = await res.json()
  // Use data...
} catch (err) {
  console.error('Error:', err)
  // Show error toast or message
}
```

---

## TypeScript Interfaces

```typescript
// Crawl Status
interface CrawlStatus {
  status: 'queued' | 'running' | 'extracting' | 'processing' | 'completed' | 'failed'
  progress: { crawled: number; total: number }
  documents_found: number
  average_quality: number
  started_at?: string
  completed_at?: string
  config?: { original_query: string }
  throughput?: number
}

// Log Entry
interface LogEntry {
  id: string
  timestamp: string
  event_type: string
  crawl_id: string
  details: any
  level: 'info' | 'warning' | 'error'
}

// Document
interface Document {
  id: string
  title: string
  url: string
  file_type: string
  file_size: number
  quality_score: number
  tags: string[]
  discovered_at: string
  metadata?: {
    subject?: string
    exam_type?: string
    year?: number
  }
}

// Error Entry
interface ErrorEntry {
  id: string
  timestamp: string
  error_type: string
  message: string
  stack_trace?: string
  url?: string
  crawl_id: string
  count: number
}
```

---

## Testing

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import { LogViewer } from '@/components/LogViewer'

// Mock fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ logs: [] })
  })
)

test('renders log viewer', async () => {
  render(<LogViewer crawlId="test-123" />)

  await waitFor(() => {
    expect(screen.getByText(/logs/i)).toBeInTheDocument()
  })
})
```

---

Last updated: 2026-01-20
