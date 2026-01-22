# GenCrawl Dashboard Enhancement - OKR

**Project:** GenCrawl Dashboard UX & Robustness Improvements
**Owner:** Full-Stack Team
**Timeline:** Week 1-2 (Sprint)
**Status:** Planning → Execution
**Date:** January 20, 2026
**Based on:** Comprehensive debugging analysis + Visual inspection

---

## Executive Summary

Transform GenCrawl dashboard from **MVP state** to **production-grade application** with:
- Complete job drill-down capabilities
- Persistent session management
- Robust error handling everywhere
- Real-time WebSocket updates
- Enhanced job history with search/filter
- Professional UX polish

**Current Health Score:** 90/100 (after critical fixes)
**Target Health Score:** 98/100 (enterprise-grade)

---

## Objective 1: Implement Complete Job Drill-Down System

**Owner:** Frontend Team
**Timeline:** Days 1-3

### Key Results

| KR | Metric | Target | Current | Measurement |
|----|--------|--------|---------|-------------|
| **KR 1.1** | Job detail pages | 100% | 70% | Full detail modal working, needs enhancement |
| **KR 1.2** | State timeline visualization | 100% | 80% | CrawlerStateFlow exists, needs polish |
| **KR 1.3** | Log viewer integration | 100% | 90% | LogViewer exists, needs data integration |
| **KR 1.4** | Results browser | 100% | 0% | Document preview/download not implemented |
| **KR 1.5** | Metadata viewer | 100% | 0% | LLM-generated config display needs work |

### Features to Implement

#### 1.1: Enhanced Job Detail View

**Current:** Basic modal with 5 tabs
**Target:** Comprehensive job detail page

```typescript
// New: /dashboard/jobs/[id]/page.tsx
export default function JobDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      {/* Job Header with Actions */}
      <JobHeader jobId={params.id} />

      {/* 6-Tab Interface */}
      <Tabs>
        <Tab name="Overview">
          <JobOverview />          // Query, config, summary stats
        </Tab>
        <Tab name="Progress">
          <StateTimeline />        // Visual state progression
          <ProgressBreakdown />    // Multi-phase progress bars
        </Tab>
        <Tab name="Results">
          <DocumentBrowser />      // Grid/list of documents
          <BulkActions />          // Download all, export JSONL
        </Tab>
        <Tab name="Logs">
          <EventLog />             // Real-time event viewer
          <LogFilters />           // Filter by type, search
        </Tab>
        <Tab name="Metrics">
          <MetricsCharts />        // Time-series charts
          <PerformanceInsights />  // Bottleneck analysis
        </Tab>
        <Tab name="Config">
          <ConfigViewer />         // LLM-generated config
          <ConfigDiff />           // Compare with defaults
        </Tab>
      </Tabs>
    </div>
  )
}
```

#### 1.2: Document Browser & Preview

```typescript
// New: components/DocumentBrowser.tsx
export function DocumentBrowser({ crawlId }: { crawlId: string }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {documents.map(doc => (
        <DocumentCard
          document={doc}
          onPreview={() => openPreview(doc)}
          onDownload={() => downloadFile(doc)}
          onOpenInWeaviate={() => searchSimilar(doc)}
        />
      ))}
    </div>
  )
}

// Features:
// - PDF preview (iframe or PDF.js)
// - Metadata display (title, date, quality score)
// - Download button
// - Search similar (if embedded)
// - Quality score visualization
```

#### 1.3: State Timeline with Durations

```typescript
// Enhanced: components/StateTimeline.tsx
export function StateTimeline({ stateHistory }: { stateHistory: StateTransition[] }) {
  return (
    <div className="relative">
      {/* Horizontal timeline */}
      <div className="flex items-center justify-between">
        {stateHistory.map((transition, i) => (
          <StateNode
            state={transition.to_state}
            timestamp={transition.timestamp}
            duration={transition.duration_seconds}
            isActive={i === stateHistory.length - 1}
            isCompleted={i < stateHistory.length - 1}
          />
        ))}
      </div>

      {/* Duration bars */}
      <div className="mt-4">
        {stateHistory.map(t => (
          <DurationBar
            state={t.to_state}
            duration={t.duration_seconds}
            percentage={(t.duration_seconds / totalDuration) * 100}
          />
        ))}
      </div>
    </div>
  )
}
```

---

## Objective 2: Implement Session Management & Persistence

**Owner:** Backend + Frontend Team
**Timeline:** Days 2-4

### Key Results

| KR | Metric | Target | Current | Measurement |
|----|--------|--------|---------|-------------|
| **KR 2.1** | Job persistence | 100% | 0% | PostgreSQL/JSON file storage |
| **KR 2.2** | Session recovery | 100% | 0% | Resume after browser close |
| **KR 2.3** | Activity tracking | 100% | 0% | User actions logged |
| **KR 2.4** | Auto-save | 100% | 0% | Save state every 30s |
| **KR 2.5** | Multi-device sync | 100% | 0% | Same view across devices |

### Features to Implement

#### 2.1: Job Persistence Layer

**Backend:** `backend/persistence/job_store.py` (NEW)

```python
class JobStore:
    """Persistent storage for crawl jobs."""

    def __init__(self, storage_type: str = "json"):
        # Options: json, postgresql, mongodb
        self.storage_type = storage_type
        if storage_type == "json":
            self.store = JSONFileStore("data/jobs/")
        elif storage_type == "postgresql":
            self.store = PostgreSQLStore()

    async def save_job(self, job: CrawlStateData):
        """Save job to persistent storage."""
        await self.store.save(job.crawl_id, job.dict())

    async def load_job(self, crawl_id: str) -> Optional[CrawlStateData]:
        """Load job from storage."""
        data = await self.store.load(crawl_id)
        return CrawlStateData(**data) if data else None

    async def list_jobs(
        self,
        status: Optional[str] = None,
        user_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[CrawlStateData]:
        """List jobs with filtering."""
        return await self.store.query(status, user_id, limit, offset)

    async def delete_job(self, crawl_id: str):
        """Delete job and associated files."""
        await self.store.delete(crawl_id)
        # Also delete logs, results, etc.
```

#### 2.2: Session State Management

**Frontend:** `lib/session/SessionManager.ts` (NEW)

```typescript
class SessionManager {
  private sessionId: string
  private autoSaveInterval: NodeJS.Timeout | null = null

  constructor() {
    // Restore or create session
    this.sessionId = localStorage.getItem('session_id') || this.createSession()
  }

  createSession(): string {
    const id = `session_${Date.now()}_${Math.random().toString(36)}`
    localStorage.setItem('session_id', id)
    this.startAutoSave()
    return id
  }

  saveState(key: string, value: any) {
    const session = this.getSession()
    session[key] = value
    localStorage.setItem(`session_${this.sessionId}`, JSON.stringify(session))
  }

  getState<T>(key: string, defaultValue: T): T {
    const session = this.getSession()
    return session[key] ?? defaultValue
  }

  getSession(): Record<string, any> {
    const stored = localStorage.getItem(`session_${this.sessionId}`)
    return stored ? JSON.parse(stored) : {}
  }

  startAutoSave() {
    // Auto-save every 30 seconds
    this.autoSaveInterval = setInterval(() => {
      this.syncToBackend()
    }, 30000)
  }

  async syncToBackend() {
    // Sync session to backend for multi-device support
    await fetch(`${API_BASE_URL}/api/v1/sessions/${this.sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(this.getSession())
    })
  }
}

export const sessionManager = new SessionManager()
```

#### 2.3: Activity Tracking

```typescript
// Track user actions for analytics
export function trackActivity(action: string, metadata: any) {
  const activity = {
    timestamp: new Date().toISOString(),
    action,
    metadata,
    session_id: sessionManager.sessionId,
    user_agent: navigator.userAgent
  }

  // Log to backend
  fetch(`${API_BASE_URL}/api/v1/activity`, {
    method: 'POST',
    body: JSON.stringify(activity)
  })

  // Also save locally
  const activities = sessionManager.getState('activities', [])
  activities.push(activity)
  sessionManager.saveState('activities', activities.slice(-100)) // Keep last 100
}
```

---

## Objective 3: Implement Real-Time WebSocket Updates

**Owner:** Backend + Frontend Team
**Timeline:** Days 3-5

### Key Results

| KR | Metric | Target | Current | Measurement |
|----|--------|--------|---------|-------------|
| **KR 3.1** | WebSocket server | 100% | 50% | Endpoint exists, needs enhancement |
| **KR 3.2** | Auto-reconnect logic | 100% | 0% | Client doesn't reconnect |
| **KR 3.3** | Event broadcasting | 100% | 70% | Event bus exists, needs WS integration |
| **KR 3.4** | Real-time UI updates | 100% | 0% | Still using polling |
| **KR 3.5** | Connection indicators | 100% | 0% | No status indicator |

### Features to Implement

#### 3.1: Enhanced WebSocket Server

**Backend:** `backend/websocket/manager.py` (NEW)

```python
from fastapi import WebSocket
from typing import Dict, Set
import asyncio

class WebSocketManager:
    """Manage WebSocket connections for real-time updates."""

    def __init__(self):
        self.connections: Dict[str, Set[WebSocket]] = {}
        self.global_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket, crawl_id: Optional[str] = None):
        """Accept WebSocket connection."""
        await websocket.accept()

        if crawl_id:
            if crawl_id not in self.connections:
                self.connections[crawl_id] = set()
            self.connections[crawl_id].add(websocket)
        else:
            self.global_connections.add(websocket)

    async def disconnect(self, websocket: WebSocket, crawl_id: Optional[str] = None):
        """Remove WebSocket connection."""
        if crawl_id and crawl_id in self.connections:
            self.connections[crawl_id].discard(websocket)
        self.global_connections.discard(websocket)

    async def broadcast(self, event: CrawlEvent):
        """Broadcast event to subscribed clients."""
        crawl_id = event.crawl_id
        message = {
            "type": event.event_type.value,
            "crawl_id": crawl_id,
            "data": event.data,
            "timestamp": event.timestamp.isoformat()
        }

        # Send to crawl-specific connections
        if crawl_id in self.connections:
            dead_connections = set()
            for ws in self.connections[crawl_id]:
                try:
                    await ws.send_json(message)
                except:
                    dead_connections.add(ws)

            # Remove dead connections
            self.connections[crawl_id] -= dead_connections

        # Send to global connections
        dead_global = set()
        for ws in self.global_connections:
            try:
                await ws.send_json(message)
            except:
                dead_global.add(ws)

        self.global_connections -= dead_global

ws_manager = WebSocketManager()
```

#### 3.2: Frontend WebSocket Client with Auto-Reconnect

**Frontend:** `lib/websocket/client.ts` (NEW)

```typescript
export class WebSocketClient {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000
  private listeners: Map<string, Set<Function>> = new Map()
  private isManualClose = false

  constructor(private crawlId?: string) {
    this.connect()
  }

  connect() {
    const url = this.crawlId
      ? `ws://localhost:8000/api/v1/crawl/${this.crawlId}/ws`
      : `ws://localhost:8000/api/v1/ws/global`

    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
      this.emit('connected', {})
    }

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      this.emit(message.type, message)
    }

    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
      this.emit('disconnected', {})

      if (!this.isManualClose && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
        console.log(`Reconnecting in ${delay}ms...`)
        setTimeout(() => this.connect(), delay)
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      this.emit('error', error)
    }
  }

  on(eventType: string, callback: Function) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(callback)
  }

  off(eventType: string, callback: Function) {
    this.listeners.get(eventType)?.delete(callback)
  }

  private emit(eventType: string, data: any) {
    this.listeners.get(eventType)?.forEach(cb => cb(data))
  }

  close() {
    this.isManualClose = true
    this.ws?.close()
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }
}

// React hook
export function useWebSocket(crawlId?: string) {
  const [connected, setConnected] = useState(false)
  const [client] = useState(() => new WebSocketClient(crawlId))

  useEffect(() => {
    client.on('connected', () => setConnected(true))
    client.on('disconnected', () => setConnected(false))

    return () => client.close()
  }, [client])

  return { client, connected }
}
```

#### 3.3: Connection Status Indicator

```typescript
// components/ConnectionStatus.tsx
export function ConnectionStatus() {
  const { connected } = useWebSocket()

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg ${
        connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
        }`} />
        <span className="text-sm font-medium">
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </div>
  )
}
```

---

## Objective 4: Enhanced Job History & Search

**Owner:** Full-Stack Team
**Timeline:** Days 3-5

### Key Results

| KR | Metric | Target | Current | Measurement |
|----|--------|--------|---------|-------------|
| **KR 4.1** | Advanced search | 100% | 30% | Basic search exists, needs enhancement |
| **KR 4.2** | Filter combinations | 10+ | 3 | Status, date, user filters |
| **KR 4.3** | Saved searches | 100% | 0% | Save filter combinations |
| **KR 4.4** | Export functionality | 3+ formats | 1 | JSON, CSV, PDF report |
| **KR 4.5** | Bulk operations | 5+ | 1 | Select multiple, bulk delete/pause |

### Features

#### 4.1: Advanced Search & Filters

```typescript
// components/AdvancedSearch.tsx
export function AdvancedSearch() {
  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {/* Text Search */}
      <input
        type="text"
        placeholder="Search query text, URLs, documents..."
        className="col-span-2"
        onChange={debounce(handleSearch, 300)}
      />

      {/* Multi-Select Filters */}
      <MultiSelect
        label="Status"
        options={['completed', 'running', 'failed', 'paused']}
        onChange={setStatusFilter}
      />

      <DateRangePicker
        label="Date Range"
        onChange={setDateRange}
      />

      <MultiSelect
        label="Sources"
        options={['moe.gov.tt', 'cxc.org', 'sea.gov.tt']}
        onChange={setSourceFilter}
      />

      <Select
        label="Quality"
        options={['High (>0.8)', 'Medium (0.6-0.8)', 'Low (<0.6)', 'All']}
        onChange={setQualityFilter}
      />

      <RangeSlider
        label="Documents Found"
        min={0}
        max={10000}
        onChange={setDocumentRange}
      />

      <Select
        label="Sort By"
        options={['Date (newest)', 'Date (oldest)', 'Duration', 'Documents', 'Quality']}
        onChange={setSortBy}
      />

      {/* Save Search */}
      <button onClick={saveCurrentSearch}>
        💾 Save Search
      </button>

      {/* Load Saved Searches */}
      <Select
        label="Saved Searches"
        options={savedSearches.map(s => s.name)}
        onChange={loadSearch}
      />
    </div>
  )
}
```

#### 4.2: Bulk Operations

```typescript
// components/BulkActions.tsx
export function BulkActions({ selectedJobs }: { selectedJobs: string[] }) {
  return (
    <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
      <span className="font-medium">{selectedJobs.length} jobs selected</span>

      <div className="flex gap-2 ml-auto">
        <button onClick={() => bulkPause(selectedJobs)}>
          Pause All
        </button>
        <button onClick={() => bulkResume(selectedJobs)}>
          Resume All
        </button>
        <button onClick={() => bulkCancel(selectedJobs)}>
          Cancel All
        </button>
        <button onClick={() => bulkDelete(selectedJobs)}>
          Delete All
        </button>
        <button onClick={() => bulkDownload(selectedJobs)}>
          Download All (ZIP)
        </button>
        <button onClick={() => bulkExport(selectedJobs, 'csv')}>
          Export CSV
        </button>
      </div>
    </div>
  )
}
```

---

## Objective 5: Dashboard UX Polish & Robustness

**Owner:** UX + QA Team
**Timeline:** Days 5-7

### Key Results

| KR | Metric | Target | Current | Measurement |
|----|--------|--------|---------|-------------|
| **KR 5.1** | Error states everywhere | 100% | 70% | All components handle errors |
| **KR 5.2** | Loading skeletons | 100% | 80% | All async components show loading |
| **KR 5.3** | Empty states with CTAs | 100% | 60% | Helpful messages + actions |
| **KR 5.4** | Keyboard navigation | 100% | 30% | Full keyboard support |
| **KR 5.5** | Mobile responsiveness | 100% | 85% | Perfect on mobile/tablet |

### UX Improvements

#### 5.1: Comprehensive Empty States

```typescript
// components/EmptyState.tsx
export function EmptyState({
  icon: Icon,
  title,
  description,
  action
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-10 h-10 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// Usage in CrawlHistoryTable:
{crawls.length === 0 && (
  <EmptyState
    icon={FileSearch}
    title="No crawls yet"
    description="Submit your first natural language crawl request to get started. Try: 'Find all CXC CSEC Mathematics past papers'"
    action={{
      label: "Submit First Crawl",
      onClick: () => router.push('/dashboard')
    }}
  />
)}
```

#### 5.2: Toast Notifications

```typescript
// lib/toast/ToastManager.tsx
export function useToast() {
  return {
    success: (message: string) => toast.success(message),
    error: (message: string) => toast.error(message),
    info: (message: string) => toast.info(message),
    warning: (message: string) => toast.warning(message),
  }
}

// Usage:
const toast = useToast()

// On crawl submit
toast.success('Crawl submitted successfully!')

// On error
toast.error('Failed to submit crawl. Please try again.')

// On completion
toast.info('Crawl completed! Found 47 documents.')
```

#### 5.3: Keyboard Shortcuts

```typescript
// hooks/useKeyboardShortcuts.ts
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K - Focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        focusSearch()
      }

      // Cmd/Ctrl + N - New crawl
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        openNewCrawlModal()
      }

      // Cmd/Ctrl + D - Toggle dark mode
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault()
        toggleDarkMode()
      }

      // Esc - Close modals
      if (e.key === 'Escape') {
        closeAllModals()
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [])
}
```

---

## Success Metrics

### Overall System Quality

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| **Code Quality** | 85/100 | 95/100 | +10 |
| **Error Handling** | 90/100 | 98/100 | +8 |
| **UX Polish** | 80/100 | 95/100 | +15 |
| **Performance** | 85/100 | 92/100 | +7 |
| **Accessibility** | 70/100 | 90/100 | +20 |
| **Mobile UX** | 85/100 | 95/100 | +10 |
| **Real-Time Updates** | 60/100 | 95/100 | +35 |
| **Job Management** | 75/100 | 95/100 | +20 |
| **Overall Health** | 90/100 | 98/100 | +8 |

---

## Implementation Timeline

| Week | Focus | Deliverables |
|------|-------|--------------|
| **Week 1, Days 1-3** | Job drill-down + persistence | Job detail pages, persistence layer, document browser |
| **Week 1, Days 4-5** | Session management | Session store, activity tracking, auto-save |
| **Week 1, Days 6-7** | WebSocket real-time | Enhanced WS server, auto-reconnect client, connection status |
| **Week 2, Days 1-3** | Advanced search | Filters, saved searches, bulk operations |
| **Week 2, Days 4-5** | UX polish | Toast notifications, keyboard shortcuts, empty states |
| **Week 2, Days 6-7** | Testing & deployment | E2E tests, performance optimization, production deployment |

---

## Priority Matrix

### P0 - Critical (Do First)
1. Job persistence (jobs lost on restart)
2. WebSocket auto-reconnect (connections drop)
3. Document browser (can't view results)

### P1 - High (This Week)
4. Enhanced job detail pages
5. Session management
6. Advanced search & filters
7. Bulk operations

### P2 - Medium (Next Week)
8. Toast notifications
9. Keyboard shortcuts
10. Mobile UX improvements

### P3 - Nice to Have
11. PDF preview
12. Multi-device sync
13. Activity analytics

---

## Success Criteria Checklist

**Before marking OKR complete:**

- [ ] Jobs persist across restarts
- [ ] WebSocket connections auto-reconnect
- [ ] Can view complete job details
- [ ] Can browse and download documents
- [ ] Can search/filter job history
- [ ] Can perform bulk operations
- [ ] Session state persists
- [ ] Real-time updates without polling
- [ ] Toast notifications on actions
- [ ] Keyboard shortcuts work
- [ ] Mobile UX is excellent
- [ ] No console errors
- [ ] All tabs functional
- [ ] Health score >95/100

---

**Status:** Ready for Autonomous Execution
**Estimated Time:** 2 weeks (full-time)
**Compressed:** 3-4 days with focused effort
**Impact:** Transform from MVP to enterprise-grade product
