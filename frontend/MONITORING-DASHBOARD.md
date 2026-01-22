# GenCrawl Monitoring Dashboard

## Overview

Enhanced monitoring dashboard for GenCrawl with real-time logging, state visualization, and analytics.

## Features

### 1. Tabbed Interface
- **Overview**: System health, live metrics, recent documents, and errors
- **Active Crawls**: Detailed monitoring of running crawl jobs
- **Logs**: Real-time event streaming with filtering and search
- **Analytics**: Charts and visualizations for crawl performance

### 2. Dark Mode Support
- Toggle between light and dark themes
- Persists preference to localStorage
- Respects system preference on first load
- Smooth transitions between themes

### 3. Real-Time Updates
- Polling every 2 seconds for active crawls
- Live metrics with sparkline trend visualization
- Auto-scrolling log viewer
- WebSocket-ready architecture (currently using polling)

## Components

### LogViewer (`components/LogViewer.tsx`)
**Purpose**: Display crawl events in real-time with filtering and search.

**Features**:
- Color-coded event types:
  - `crawl_start`: Blue
  - `page_crawled`: Green (success) / Red (failed)
  - `document_found`: Purple
  - `extraction`: Yellow
  - `quality_check`: Cyan
  - `error`: Red
- Search across all log fields
- Filter by event type (multi-select)
- Auto-scroll to latest events
- Export logs to JSON

**Props**:
```typescript
interface LogViewerProps {
  crawlId?: string      // Filter to specific crawl, or show all
  autoScroll?: boolean  // Auto-scroll to latest (default: true)
}
```

**API Endpoints**:
- `GET /api/v1/logs/{crawl_id}` - Get logs for specific crawl
- `GET /api/v1/logs/all` - Get all system logs

### CrawlerStateFlow (`components/CrawlerStateFlow.tsx`)
**Purpose**: Visualize crawler state machine progression.

**States**:
1. **Queued**: Waiting to start (~5s)
2. **Running**: Actively crawling pages (~120s)
3. **Extracting**: Processing page content (~30s)
4. **Processing**: Finalizing data (~15s)
5. **Completed**: Successfully finished

**Features**:
- Visual progress indicators for each state
- Current state highlighted with animation
- Elapsed time tracking
- Estimated time for each stage
- Progress bar during crawling phase
- Real-time metrics (documents found, quality score)

**Props**:
```typescript
interface CrawlerStateFlowProps {
  crawlId: string  // Required: which crawl to monitor
}
```

### LiveMetrics (`components/LiveMetrics.tsx`)
**Purpose**: Display key performance indicators with sparkline trends.

**Metrics**:
1. **Pages Crawled**: Current/Total pages processed
2. **Documents Found**: Total documents discovered
3. **Success Rate**: Percentage of successful page crawls
4. **Throughput**: Pages processed per minute
5. **Avg Quality Score**: Mean quality score of documents
6. **Active Time**: How long the crawl has been running

**Features**:
- Sparkline charts showing last 20 data points
- Color-coded metric cards
- Real-time updates every 2 seconds
- Responsive grid layout

**Props**:
```typescript
interface LiveMetricsProps {
  crawlId?: string  // Optional: filter to specific crawl
}
```

### DocumentFeed (`components/DocumentFeed.tsx`)
**Purpose**: Live feed of discovered documents as they're found.

**Features**:
- Real-time document discovery feed
- Display: title, URL, file type, size, quality score
- Tag filtering (subject, exam type, year)
- Click to preview or download
- Color-coded by file type
- Quality score indicators (green/yellow/red)
- Metadata badges (subject, exam type, year)

**Props**:
```typescript
interface DocumentFeedProps {
  crawlId?: string  // Filter to specific crawl
  limit?: number    // Max number of documents to show
}
```

**API Endpoints**:
- `GET /api/v1/crawl/{crawl_id}/documents`
- `GET /api/v1/documents/recent?limit={n}`

### Analytics (`components/Analytics.tsx`)
**Purpose**: Visualize crawl performance with charts and graphs.

**Charts**:
1. **Progress Over Time**: Line chart showing pages crawled and documents found
2. **Documents by Type**: Pie chart of file type distribution
3. **Documents by Source**: Bar chart of source domains
4. **Quality Distribution**: Histogram of quality score ranges

**Features**:
- Built with Recharts library
- Dark mode compatible
- Export data to CSV
- Auto-updates every 5 seconds
- Empty states with helpful messages

**Props**:
```typescript
interface AnalyticsProps {
  crawlId?: string  // Filter to specific crawl
}
```

### ErrorTracker (`components/ErrorTracker.tsx`)
**Purpose**: Track and manage crawl errors.

**Features**:
- Grouped by error type
- Shows frequency (occurrence count)
- Expandable details with stack traces
- Retry functionality (single or batch)
- Color-coded by severity:
  - Yellow: Timeout/Network errors
  - Orange: Parse/Extraction errors
  - Red: Critical errors
- Click to expand/collapse error groups

**Props**:
```typescript
interface ErrorTrackerProps {
  crawlId?: string  // Filter to specific crawl
}
```

**API Endpoints**:
- `GET /api/v1/crawl/{crawl_id}/errors`
- `GET /api/v1/errors/all`
- `POST /api/v1/crawl/retry` (body: `{ error_ids: string[] }`)

## Backend API Requirements

The dashboard expects these endpoints to be available:

### Required Endpoints

```typescript
// Crawl Status
GET /api/v1/crawl/{crawl_id}/status
Response: {
  status: 'queued' | 'running' | 'extracting' | 'processing' | 'completed' | 'failed'
  progress: { crawled: number, total: number }
  documents_found: number
  average_quality: number
  started_at: string (ISO 8601)
  completed_at?: string (ISO 8601)
  config: { original_query: string, ... }
  throughput?: number  // pages per minute
}

// Logs
GET /api/v1/logs/{crawl_id}
GET /api/v1/logs/all
Response: {
  logs: Array<{
    id: string
    timestamp: string (ISO 8601)
    event_type: string
    crawl_id: string
    details: any
    level: 'info' | 'warning' | 'error'
  }>
}

// Log Statistics
GET /api/v1/logs/{crawl_id}/stats
Response: {
  total: number
  by_type: Record<string, number>
  by_level: Record<string, number>
}

// Documents
GET /api/v1/crawl/{crawl_id}/documents
GET /api/v1/documents/recent?limit={n}
Response: {
  documents: Array<{
    id: string
    title: string
    url: string
    file_type: string
    file_size: number
    quality_score: number
    tags: string[]
    discovered_at: string (ISO 8601)
    metadata?: {
      subject?: string
      exam_type?: string
      year?: number
    }
  }>
}

// Analytics
GET /api/v1/crawl/{crawl_id}/analytics
GET /api/v1/analytics/overview
Response: {
  progress_over_time: Array<{ time: string, pages: number, documents: number }>
  documents_by_type: Array<{ type: string, count: number }>
  documents_by_source: Array<{ source: string, count: number }>
  quality_distribution: Array<{ range: string, count: number }>
}

// Errors
GET /api/v1/crawl/{crawl_id}/errors
GET /api/v1/errors/all
Response: {
  errors: Array<{
    id: string
    timestamp: string (ISO 8601)
    error_type: string
    message: string
    stack_trace?: string
    url?: string
    crawl_id: string
    count: number  // how many times this occurred
  }>
}

// Retry Failed Crawls
POST /api/v1/crawl/retry
Body: { error_ids: string[] }
Response: { success: boolean, retried: number }

// System Health (already exists)
GET /api/v1/health
Response: {
  services: {
    api: 'up' | 'down'
    database: 'up' | 'down'
    redis: 'up' | 'down'
    weaviate: 'up' | 'down'
  }
}
```

## Usage

### Starting a Crawl
1. Enter your query in the input field
2. Click "Start Crawl"
3. Automatically switches to "Active Crawls" tab
4. Monitor progress in real-time

### Monitoring Active Crawls
1. Navigate to "Active Crawls" tab
2. Select specific crawl from dropdown (if multiple)
3. View state progression, metrics, and documents
4. Check logs for detailed events

### Viewing Logs
1. Navigate to "Logs" tab
2. Filter by crawl ID (optional)
3. Search for specific events
4. Filter by event type using tags
5. Export to JSON for offline analysis

### Analyzing Performance
1. Navigate to "Analytics" tab
2. View charts and trends
3. Export data to CSV
4. Compare across crawls

### Error Management
1. View errors in "Overview" tab or "Active Crawls"
2. Click error group to expand details
3. View stack traces
4. Retry individual errors or entire groups

## Keyboard Shortcuts

- **⌘/Ctrl + K**: Focus search (in logs)
- **Escape**: Clear filters
- **Tab 1-4**: Switch between tabs
- **Dark Mode Toggle**: Click sun/moon icon

## Accessibility

- Semantic HTML throughout
- ARIA labels on interactive elements
- Keyboard navigation support
- Color-blind friendly color scheme
- Screen reader compatible
- Focus indicators on all interactive elements

## Performance Optimizations

1. **Lazy Loading**: Components render only when tab is active
2. **Debounced Search**: Search input debounced to 300ms
3. **Virtualization**: Log viewer virtualizes long lists (future)
4. **Memoization**: Expensive computations cached with `useMemo`
5. **Polling Intervals**: Longer intervals for less critical data
6. **Request Cancellation**: Abort previous requests on unmount

## Responsive Design

- **Mobile**: Single column layout, collapsible sections
- **Tablet**: 2-column grid for metrics
- **Desktop**: Full 3-column grid, side-by-side comparisons

Breakpoints:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

## Future Enhancements

### Short Term
- [ ] WebSocket support for real-time updates (replace polling)
- [ ] Toast notifications for important events
- [ ] Crawl comparison mode (side-by-side)
- [ ] Custom dashboard layouts (drag-and-drop)
- [ ] Download documents directly from feed

### Medium Term
- [ ] Advanced filtering (date ranges, quality thresholds)
- [ ] Saved filters and views
- [ ] Scheduled crawls
- [ ] Email/Slack notifications
- [ ] Crawl templates

### Long Term
- [ ] Machine learning insights (predict failures, optimize)
- [ ] A/B testing crawl strategies
- [ ] Multi-tenant support
- [ ] Role-based access control
- [ ] API rate limiting visualization

## Troubleshooting

### Logs Not Updating
- Check backend API is running on `http://localhost:8000`
- Verify CORS is configured correctly
- Check browser console for network errors
- Ensure `/api/v1/logs/*` endpoints are implemented

### Metrics Showing Zero
- Ensure crawl has started (check status endpoint)
- Verify data is being written to backend database
- Check API response format matches expected schema

### Charts Not Rendering
- Verify Recharts is installed: `npm list recharts`
- Check for console errors related to chart data
- Ensure data arrays have at least 1 element

### Dark Mode Not Persisting
- Check localStorage is enabled in browser
- Verify no browser extensions are blocking localStorage
- Clear browser cache and try again

## Development

### Running Locally
```bash
cd /Users/antonalexander/projects/gencrawl/frontend
npm install
npm run dev
```

### Building for Production
```bash
npm run build
npm start
```

### Testing
```bash
npm run lint
npm run type-check
```

## File Structure

```
/Users/antonalexander/projects/gencrawl/frontend/
├── app/
│   └── dashboard/
│       └── page.tsx              # Main dashboard page
├── components/
│   ├── LogViewer.tsx             # Real-time log viewer
│   ├── CrawlerStateFlow.tsx      # State machine visualization
│   ├── LiveMetrics.tsx           # Metrics with sparklines
│   ├── DocumentFeed.tsx          # Document discovery feed
│   ├── Analytics.tsx             # Charts and graphs
│   ├── ErrorTracker.tsx          # Error management
│   ├── CrawlInput.tsx            # Existing: crawl submission
│   ├── CrawlProgress.tsx         # Existing: progress bars
│   ├── SystemHealth.tsx          # Existing: service health
│   └── DocumentStats.tsx         # Existing: document stats
├── tailwind.config.ts            # Tailwind with dark mode
├── package.json                  # Dependencies
└── MONITORING-DASHBOARD.md       # This file
```

## Dependencies

Required packages (already in package.json):
- `react` ^19.0.0
- `react-dom` ^19.0.0
- `next` ^15.1.4
- `recharts` ^2.15.0 - Charts and graphs
- `lucide-react` ^0.469.0 - Icons
- `tailwindcss` ^3.4.0 - Styling

## License

Same as GenCrawl project.

## Contributing

1. Create feature branch
2. Make changes
3. Test locally with backend running
4. Submit PR with screenshots
5. Update this documentation if needed

## Support

For issues or questions:
- GitHub Issues: [gencrawl/issues](https://github.com/your-org/gencrawl/issues)
- Email: support@gencrawl.io

---

Last updated: 2026-01-20
