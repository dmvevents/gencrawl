# Component Architecture

Visual breakdown of the monitoring dashboard component hierarchy and data flow.

## Component Tree

```
Dashboard (app/dashboard/page.tsx)
│
├── Header
│   ├── Title & Description
│   └── Dark Mode Toggle (Sun/Moon)
│
├── CrawlInput
│   └── Form (submits → creates crawl → updates activeCrawls)
│
├── SystemHealth
│   └── 4x Service Cards (API, Database, Redis, Weaviate)
│
├── Tab Navigation
│   ├── Overview Tab
│   ├── Active Crawls Tab
│   ├── Logs Tab
│   └── Analytics Tab
│
└── Tab Content (conditional rendering)
    │
    ├── [OVERVIEW TAB]
    │   ├── LiveMetrics (all crawls)
    │   │   └── 6x Metric Cards with Sparklines
    │   │
    │   ├── DocumentFeed (limit: 10)
    │   │   └── Document Cards with Actions
    │   │
    │   ├── DocumentStats (existing)
    │   │   └── Statistics Display
    │   │
    │   └── ErrorTracker (all errors)
    │       └── Error Groups (expandable)
    │
    ├── [ACTIVE CRAWLS TAB]
    │   ├── Crawl Selection Dropdown (if multiple crawls)
    │   │
    │   ├── CrawlerStateFlow (if crawl selected)
    │   │   ├── State Pipeline Visualization
    │   │   ├── Progress Bar
    │   │   └── Metrics (documents, quality)
    │   │
    │   ├── LiveMetrics (selected crawl or all)
    │   │   └── 6x Metric Cards with Sparklines
    │   │
    │   ├── Active Crawls List
    │   │   └── CrawlProgress (for each crawl)
    │   │
    │   └── DocumentFeed (selected crawl) [if selected]
    │       └── Document Cards
    │
    ├── [LOGS TAB]
    │   ├── Crawl Selection Dropdown (filter)
    │   │
    │   └── LogViewer (selected crawl or all)
    │       ├── Search Bar
    │       ├── Filter Panel (toggle)
    │       └── Log Entries (color-coded)
    │
    └── [ANALYTICS TAB]
        ├── Crawl Selection Dropdown (filter)
        │
        └── Analytics (selected crawl or all)
            ├── Export Button
            ├── Progress Over Time (Line Chart)
            ├── Documents by Type (Pie Chart)
            ├── Documents by Source (Bar Chart)
            └── Quality Distribution (Histogram)
```

---

## Data Flow

### Polling Architecture

```
Browser                  Backend API
   │                         │
   ├── Every 2s ────────────→ GET /api/v1/crawl/{id}/status
   │  (CrawlerStateFlow)  ←── { status, progress, ... }
   │                         │
   ├── Every 2s ────────────→ GET /api/v1/logs/{id}
   │  (LogViewer)         ←── { logs: [...] }
   │                         │
   ├── Every 2s ────────────→ GET /api/v1/crawl/{id}/status
   │  (LiveMetrics)       ←── { progress, throughput, ... }
   │                         │
   ├── Every 3s ────────────→ GET /api/v1/crawl/{id}/documents
   │  (DocumentFeed)      ←── { documents: [...] }
   │                         │
   ├── Every 5s ────────────→ GET /api/v1/crawl/{id}/analytics
   │  (Analytics)         ←── { charts: [...] }
   │                         │
   └── Every 5s ────────────→ GET /api/v1/crawl/{id}/errors
      (ErrorTracker)      ←── { errors: [...] }
```

### State Management

```
Dashboard Component
│
├── State Variables:
│   ├── activeCrawls: string[]           (list of crawl IDs)
│   ├── activeTab: TabType               (current tab)
│   ├── darkMode: boolean                (theme state)
│   └── selectedCrawl: string|undefined  (for filtering)
│
└── State Flow:
    │
    ├── CrawlInput submits
    │   └── → handleCrawlSubmitted(crawlId)
    │       ├── → setActiveCrawls([...activeCrawls, crawlId])
    │       ├── → setSelectedCrawl(crawlId)
    │       └── → setActiveTab('active')
    │
    ├── Tab Navigation clicks
    │   └── → setActiveTab(newTab)
    │
    ├── Dark Mode Toggle clicks
    │   └── → toggleDarkMode()
    │       ├── → setDarkMode(!darkMode)
    │       ├── → document.documentElement.classList.toggle('dark')
    │       └── → localStorage.setItem('theme', ...)
    │
    └── Crawl Selection changes
        └── → setSelectedCrawl(crawlId)
            └── → Child components re-fetch with new crawlId
```

---

## Component Responsibilities

### Dashboard (Page Component)
**Role**: Orchestrator
**Responsibilities**:
- Manage active crawls list
- Handle tab switching
- Provide crawl selection
- Toggle dark mode
- Pass props to child components

**State**:
- `activeCrawls: string[]`
- `activeTab: TabType`
- `darkMode: boolean`
- `selectedCrawl: string | undefined`

---

### LogViewer
**Role**: Log Display & Filtering
**Responsibilities**:
- Fetch logs from API
- Display color-coded events
- Provide search functionality
- Filter by event type
- Export to JSON
- Auto-scroll to latest

**Props**:
- `crawlId?: string` - Filter to specific crawl
- `autoScroll?: boolean` - Enable auto-scrolling

**Internal State**:
- `logs: LogEntry[]` - All logs
- `filteredLogs: LogEntry[]` - After filtering
- `searchTerm: string` - Search query
- `selectedTypes: Set<string>` - Active filters
- `showFilters: boolean` - Filter panel visibility

**API Calls**:
- `GET /api/v1/logs/{crawl_id}` (if crawlId provided)
- `GET /api/v1/logs/all` (if no crawlId)
- Polling: Every 2 seconds

---

### CrawlerStateFlow
**Role**: State Machine Visualization
**Responsibilities**:
- Display current state
- Show progress through pipeline
- Animate state transitions
- Track elapsed time
- Display key metrics

**Props**:
- `crawlId: string` (required)

**Internal State**:
- `state: CrawlerState | null`
- `estimatedTimes: Record<string, number>`

**API Calls**:
- `GET /api/v1/crawl/{crawl_id}/status`
- Polling: Every 2 seconds

**States**:
1. Queued → 2. Running → 3. Extracting → 4. Processing → 5. Completed/Failed

---

### LiveMetrics
**Role**: Key Performance Indicators
**Responsibilities**:
- Fetch and display 6 metrics
- Show sparkline trends
- Update in real-time
- Calculate changes

**Props**:
- `crawlId?: string` - Filter to specific crawl

**Internal State**:
- `metrics: Record<string, Metric>` - All metrics with trends

**Metrics**:
1. Pages Crawled
2. Documents Found
3. Success Rate (%)
4. Throughput (pages/min)
5. Avg Quality Score (%)
6. Active Time (min)

**API Calls**:
- `GET /api/v1/crawl/{crawl_id}/status` (if crawlId)
- `GET /api/v1/crawl/stats` (if no crawlId)
- Polling: Every 2 seconds

---

### DocumentFeed
**Role**: Document Discovery Stream
**Responsibilities**:
- Display discovered documents
- Show metadata and tags
- Provide filtering by tags
- Enable downloads
- Color-code by quality

**Props**:
- `crawlId?: string` - Filter to specific crawl
- `limit?: number` - Max documents to show

**Internal State**:
- `documents: Document[]` - All documents
- `filteredDocs: Document[]` - After filtering
- `selectedTags: Set<string>` - Active tag filters
- `showFilters: boolean` - Filter panel visibility

**API Calls**:
- `GET /api/v1/crawl/{crawl_id}/documents` (if crawlId)
- `GET /api/v1/documents/recent?limit={n}` (if no crawlId)
- Polling: Every 3 seconds

---

### Analytics
**Role**: Data Visualization
**Responsibilities**:
- Fetch analytics data
- Render 4 chart types
- Provide CSV export
- Handle empty states

**Props**:
- `crawlId?: string` - Filter to specific crawl

**Internal State**:
- `data: AnalyticsData` - Chart data

**Charts**:
1. Progress Over Time (LineChart)
2. Documents by Type (PieChart)
3. Documents by Source (BarChart)
4. Quality Distribution (BarChart)

**API Calls**:
- `GET /api/v1/crawl/{crawl_id}/analytics` (if crawlId)
- `GET /api/v1/analytics/overview` (if no crawlId)
- Polling: Every 5 seconds

---

### ErrorTracker
**Role**: Error Management
**Responsibilities**:
- Display errors grouped by type
- Show stack traces
- Provide retry functionality
- Indicate severity
- Track frequency

**Props**:
- `crawlId?: string` - Filter to specific crawl

**Internal State**:
- `errors: ErrorEntry[]` - All errors
- `groupedErrors: Map<string, ErrorEntry[]>` - Grouped
- `expandedGroups: Set<string>` - Expanded error types
- `retrying: Set<string>` - Currently retrying

**API Calls**:
- `GET /api/v1/crawl/{crawl_id}/errors` (if crawlId)
- `GET /api/v1/errors/all` (if no crawlId)
- `POST /api/v1/crawl/retry` (for retry action)
- Polling: Every 5 seconds

---

## Shared Utilities

### Color Helpers
```typescript
// Event colors
const EVENT_COLORS = {
  crawl_start: 'bg-blue-50 border-blue-200 text-blue-800',
  page_crawled: 'bg-green-50 border-green-200 text-green-800',
  // ...
}

// Quality colors
const getQualityColor = (score: number) => {
  if (score >= 80) return 'text-green-600 bg-green-100'
  if (score >= 60) return 'text-yellow-600 bg-yellow-100'
  return 'text-red-600 bg-red-100'
}

// State colors
const stateColors = {
  queued: 'bg-gray-100 border-gray-300',
  running: 'bg-blue-100 border-blue-500',
  completed: 'bg-green-100 border-green-500',
  // ...
}
```

### Format Helpers
```typescript
// File size
const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Time
const getElapsedTime = (startTime: string) => {
  const seconds = (Date.now() - new Date(startTime).getTime()) / 1000
  if (seconds < 60) return `${Math.floor(seconds)}s`
  return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`
}
```

---

## Communication Patterns

### Parent → Child (Props)
```tsx
<LogViewer
  crawlId={selectedCrawl}    // Filter data
  autoScroll={true}           // Behavior config
/>
```

### Child → Parent (Callbacks)
```tsx
<CrawlInput
  onCrawlSubmitted={(crawlId) => {
    setActiveCrawls([...activeCrawls, crawlId])
    setSelectedCrawl(crawlId)
  }}
/>
```

### Sibling Communication (Shared State)
```tsx
// Dashboard manages state
const [selectedCrawl, setSelectedCrawl] = useState<string>()

// Multiple children use same state
<LiveMetrics crawlId={selectedCrawl} />
<DocumentFeed crawlId={selectedCrawl} />
<LogViewer crawlId={selectedCrawl} />
```

---

## Performance Optimizations

### 1. Conditional Rendering
Only render active tab:
```tsx
{activeTab === 'analytics' && (
  <Analytics crawlId={selectedCrawl} />
)}
```

### 2. Polling Management
Different intervals for different needs:
- Critical (status): 2s
- Normal (logs, metrics): 2s
- Less critical (analytics): 5s

### 3. Data Limiting
Use limit props:
```tsx
<DocumentFeed limit={10} />  // Only show 10 recent
```

### 4. Memoization (Future)
```tsx
const filteredLogs = useMemo(
  () => logs.filter(/* ... */),
  [logs, searchTerm, selectedTypes]
)
```

---

## Error Handling

### Component Level
```tsx
try {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  const data = await res.json()
  setData(data)
} catch (err) {
  console.error('Error:', err)
  // Show error state or toast
}
```

### Network Failures
- Components show stale data
- Console logs errors
- User sees last successful state

### API Errors
- Check response status
- Parse error messages
- Display user-friendly errors

---

## Testing Strategy

### Unit Tests
Test individual components:
```typescript
test('LogViewer filters by event type', () => {
  render(<LogViewer crawlId="test" />)
  // ... assertions
})
```

### Integration Tests
Test component interactions:
```typescript
test('Dashboard switches tabs', () => {
  render(<Dashboard />)
  fireEvent.click(screen.getByText('Logs'))
  expect(screen.getByRole('tabpanel')).toContainElement(/* ... */)
})
```

### E2E Tests
Test full user flows:
```typescript
test('User can monitor a crawl', async () => {
  // Submit crawl
  // Wait for status update
  // Check metrics appear
  // Verify logs stream
})
```

---

## Future Architecture Improvements

### WebSockets
Replace polling with WebSocket connections:
```typescript
const ws = new WebSocket('ws://localhost:8000/ws/logs')
ws.onmessage = (event) => {
  const newLog = JSON.parse(event.data)
  setLogs(prev => [...prev, newLog])
}
```

### State Management Library
For complex apps, consider Redux/Zustand:
```typescript
// store.ts
export const useCrawlStore = create((set) => ({
  activeCrawls: [],
  addCrawl: (id) => set((state) => ({
    activeCrawls: [...state.activeCrawls, id]
  }))
}))
```

### Component Library
Extract reusable components:
- Card, Button, Badge
- Input, Select, Checkbox
- Modal, Toast, Dropdown

---

Last updated: 2026-01-20
