# GenCrawl Dashboard Enhancement - Autonomous Execution Prompt

**For:** Claude Code / AI Coding Agents
**Date:** January 20, 2026
**Version:** 1.0

---

# 🎯 MISSION

You are a senior full-stack engineer tasked with transforming the GenCrawl dashboard from MVP to **production-grade enterprise application**. Your mission is to implement all improvements identified in the comprehensive analysis.

**Location:** `~/projects/gencrawl`

**Read These First:**
1. `~/projects/gencrawl/docs/DASHBOARD-IMPROVEMENT-OKR.md` - OKR document
2. `~/projects/gencrawl/DEBUGGING-REPORT.md` - Issues identified
3. `~/projects/gencrawl/FIXES-APPLIED-SUMMARY.md` - Current status

**Success Criteria:**
- [ ] Jobs persist across restarts (PostgreSQL or JSON files)
- [ ] WebSocket real-time updates (no more polling)
- [ ] Complete job drill-down (view all details, logs, documents)
- [ ] Advanced search & filtering (10+ filter options)
- [ ] Bulk operations (select multiple, batch actions)
- [ ] Session management (auto-save, recovery)
- [ ] Toast notifications (user feedback)
- [ ] Keyboard shortcuts (power user features)
- [ ] Perfect mobile UX
- [ ] Health score >95/100

---

# 📋 PHASE 0: PLANNING (MANDATORY)

**BEFORE CODING:**

1. **Read Documentation** (30 min):
   - DASHBOARD-IMPROVEMENT-OKR.md
   - DEBUGGING-REPORT.md
   - Current component code in `frontend/components/`

2. **Create Implementation Plan** showing:
   - Phase breakdown with dependencies
   - Time estimates per phase
   - Files to create/modify
   - Testing strategy
   - Risk mitigation

3. **Get Approval** - Wait for user confirmation

**OUTPUT YOUR PLAN NOW.**

---

# 🚀 PHASE 1: Backend Persistence Layer (Day 1, 4 hours)

## 1.1: Create Job Storage System

**File:** `backend/persistence/job_store.py` (NEW)

```python
from typing import List, Optional, Dict, Any
from pathlib import Path
import json
from datetime import datetime
from models.crawl_state import CrawlStateData

class JSONJobStore:
    """JSON file-based job storage."""

    def __init__(self, storage_dir: str = "data/jobs"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        self.index_file = self.storage_dir / "index.json"
        self._load_index()

    def _load_index(self):
        """Load job index."""
        if self.index_file.exists():
            with open(self.index_file) as f:
                self.index = json.load(f)
        else:
            self.index = {"jobs": {}, "last_updated": None}

    def _save_index(self):
        """Save job index."""
        self.index["last_updated"] = datetime.utcnow().isoformat()
        with open(self.index_file, 'w') as f:
            json.dump(self.index, f, indent=2)

    async def save(self, crawl_id: str, data: Dict[str, Any]):
        """Save job data."""
        job_file = self.storage_dir / f"{crawl_id}.json"

        # Save full data
        with open(job_file, 'w') as f:
            json.dump(data, f, indent=2, default=str)

        # Update index
        self.index["jobs"][crawl_id] = {
            "status": data.get("current_state", {}).get("value", "unknown"),
            "created_at": data.get("created_at"),
            "query": data.get("config", {}).get("original_query", ""),
            "file": str(job_file)
        }
        self._save_index()

    async def load(self, crawl_id: str) -> Optional[Dict[str, Any]]:
        """Load job data."""
        job_file = self.storage_dir / f"{crawl_id}.json"
        if not job_file.exists():
            return None

        with open(job_file) as f:
            return json.load(f)

    async def list(
        self,
        status: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """List jobs with filtering."""
        jobs = list(self.index["jobs"].values())

        # Filter by status
        if status:
            jobs = [j for j in jobs if j["status"] == status]

        # Sort by created_at (newest first)
        jobs.sort(key=lambda x: x.get("created_at", ""), reverse=True)

        # Paginate
        return jobs[offset:offset + limit]

    async def delete(self, crawl_id: str):
        """Delete job."""
        job_file = self.storage_dir / f"{crawl_id}.json"
        if job_file.exists():
            job_file.unlink()

        if crawl_id in self.index["jobs"]:
            del self.index["jobs"][crawl_id]
            self._save_index()
```

## 1.2: Integrate Persistence with Manager

**File:** `backend/crawlers/manager.py` (UPDATE)

```python
from persistence.job_store import JSONJobStore

class CrawlerManager:
    def __init__(self):
        # ... existing code ...
        self.job_store = JSONJobStore()
        self._load_jobs_from_storage()  # Load on startup

    async def _load_jobs_from_storage(self):
        """Load all jobs from persistent storage on startup."""
        jobs = await self.job_store.list(limit=1000)
        for job_meta in jobs:
            crawl_id = list(self.job_store.index["jobs"].keys())[
                list(self.job_store.index["jobs"].values()).index(job_meta)
            ]
            job_data = await self.job_store.load(crawl_id)
            if job_data:
                # Reconstruct job state
                state_data = CrawlStateData(**job_data)
                self.jobs[crawl_id] = state_data
                self.state_machines[crawl_id] = CrawlStateMachine(state_data)
                self.loggers[crawl_id] = CrawlLogger(crawl_id)

    async def _save_job_to_storage(self, crawl_id: str):
        """Save job to persistent storage."""
        if crawl_id in self.jobs:
            await self.job_store.save(crawl_id, self.jobs[crawl_id].dict())

    async def execute_crawl(self, crawl_id: str):
        # ... existing code ...

        # Save after each state transition
        await self._save_job_to_storage(crawl_id)
```

## 1.3: Add Auto-Save

```python
# Auto-save every state transition
await self._transition_state(crawl_id, CrawlState.CRAWLING)
await self._save_job_to_storage(crawl_id)  # Save immediately

# Auto-save on error
except Exception as e:
    state_data.error_message = str(e)
    await self._transition_state(crawl_id, CrawlState.FAILED)
    await self._save_job_to_storage(crawl_id)  # Save error state
```

---

# 🌐 PHASE 2: WebSocket Real-Time Updates (Day 2, 4 hours)

## 2.1: Enhanced WebSocket Manager

**File:** `backend/websocket/manager.py` (NEW - from OKR)

*[Code provided in OKR document]*

## 2.2: Integrate with Event Bus

**File:** `backend/events/event_bus.py` (UPDATE)

```python
class EventBus:
    def __init__(self):
        # ... existing code ...
        from websocket.manager import ws_manager
        self.ws_manager = ws_manager

    async def publish(self, event: CrawlEvent):
        # ... existing code ...

        # Broadcast to WebSocket clients
        await self.ws_manager.broadcast(event)
```

## 2.3: Frontend WebSocket Client

**File:** `frontend/lib/websocket/client.ts` (NEW - from OKR)

*[Code provided in OKR document]*

## 2.4: Update Components to Use WebSocket

**File:** `frontend/components/LiveMetrics.tsx` (UPDATE)

```typescript
// Replace polling with WebSocket
export function LiveMetrics({ crawlId }: { crawlId?: string }) {
  const [metrics, setMetrics] = useState(null)
  const { client, connected } = useWebSocket(crawlId)

  useEffect(() => {
    // Listen for metrics updates
    client.on('METRICS_UPDATE', (data) => {
      setMetrics(data.data)
    })

    // Initial fetch
    fetchMetrics()
  }, [client, crawlId])

  // No more setInterval polling!
}
```

## 2.5: Connection Status Indicator

**File:** `frontend/components/ConnectionStatus.tsx` (NEW - from OKR)

*[Code provided in OKR document]*

Add to layout:
```typescript
// app/dashboard/page.tsx
<div className="relative">
  <Dashboard />
  <ConnectionStatus />  {/* Show connection status */}
</div>
```

---

# 📊 PHASE 3: Enhanced Job Drill-Down (Day 3, 4 hours)

## 3.1: Job Detail Page

**File:** `frontend/app/dashboard/jobs/[id]/page.tsx` (NEW)

```typescript
'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { crawlsApi } from '@/lib/api/client'
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@/components/ui/Tabs'

export default function JobDetailPage() {
  const params = useParams()
  const jobId = params.id as string
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadJobDetails()
  }, [jobId])

  const loadJobDetails = async () => {
    try {
      const data = await crawlsApi.getFull(jobId)
      setJob(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingSkeleton />
  if (!job) return <NotFound />

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbItem href="/dashboard">Dashboard</BreadcrumbItem>
        <BreadcrumbItem href="/dashboard?tab=history">History</BreadcrumbItem>
        <BreadcrumbItem active>{job.config.original_query.slice(0, 50)}...</BreadcrumbItem>
      </Breadcrumb>

      {/* Job Header */}
      <JobHeader
        job={job}
        onRerun={handleRerun}
        onDownload={handleDownload}
        onDelete={handleDelete}
        onPause={handlePause}
        onResume={handleResume}
      />

      {/* Main Content */}
      <Tabs defaultTab="overview">
        <TabList>
          <Tab id="overview">Overview</Tab>
          <Tab id="progress">Progress</Tab>
          <Tab id="results">Results ({job.metrics.documents_found})</Tab>
          <Tab id="logs">Logs ({job.event_count})</Tab>
          <Tab id="metrics">Metrics</Tab>
          <Tab id="config">Configuration</Tab>
        </TabList>

        <TabPanels>
          <TabPanel id="overview">
            <JobOverview job={job} />
          </TabPanel>
          <TabPanel id="progress">
            <StateTimeline history={job.state_history} />
            <ProgressBreakdown progress={job.progress} />
          </TabPanel>
          <TabPanel id="results">
            <DocumentBrowser crawlId={jobId} />
          </TabPanel>
          <TabPanel id="logs">
            <EventLog crawlId={jobId} />
          </TabPanel>
          <TabPanel id="metrics">
            <MetricsCharts crawlId={jobId} />
          </TabPanel>
          <TabPanel id="config">
            <ConfigViewer config={job.config} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  )
}
```

## 3.2: Document Browser

**File:** `frontend/components/DocumentBrowser.tsx` (NEW)

```typescript
export function DocumentBrowser({ crawlId }: { crawlId: string }) {
  const [documents, setDocuments] = useState([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadDocuments()
  }, [crawlId])

  const loadDocuments = async () => {
    const data = await documentsApi.getCrawlDocuments(crawlId)
    setDocuments(data.documents)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {documents.length} documents found
          </span>
          {selectedDocs.size > 0 && (
            <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {selectedDocs.size} selected
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <ButtonGroup>
            <Button onClick={() => setViewMode('grid')} active={viewMode === 'grid'}>
              Grid
            </Button>
            <Button onClick={() => setViewMode('list')} active={viewMode === 'list'}>
              List
            </Button>
          </ButtonGroup>

          {/* Bulk Actions */}
          {selectedDocs.size > 0 && (
            <>
              <button onClick={() => bulkDownload(Array.from(selectedDocs))}>
                Download Selected
              </button>
              <button onClick={() => bulkExport(Array.from(selectedDocs), 'jsonl')}>
                Export JSONL
              </button>
            </>
          )}

          {/* Download All */}
          <button onClick={() => downloadAll(crawlId)}>
            Download All (ZIP)
          </button>
        </div>
      </div>

      {/* Document Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map(doc => (
            <DocumentCard
              key={doc.id}
              document={doc}
              isSelected={selectedDocs.has(doc.id)}
              onToggleSelect={() => toggleSelection(doc.id)}
              onPreview={() => openPreview(doc)}
              onDownload={() => downloadDocument(doc)}
            />
          ))}
        </div>
      ) : (
        <DocumentTable
          documents={documents}
          selectedDocs={selectedDocs}
          onToggleSelect={toggleSelection}
        />
      )}
    </div>
  )
}
```

**File:** `frontend/components/DocumentCard.tsx` (NEW)

```typescript
export function DocumentCard({ document, isSelected, onToggleSelect, onPreview, onDownload }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${
      isSelected ? 'ring-2 ring-blue-500' : ''
    }`}>
      {/* Checkbox */}
      <div className="flex items-start justify-between mb-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="w-4 h-4 text-blue-600 rounded"
        />
        <QualityBadge score={document.quality_score} />
      </div>

      {/* Icon based on file type */}
      <div className="mb-3">
        <FileIcon type={document.file_type} size={48} />
      </div>

      {/* Title */}
      <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
        {document.title || document.filename}
      </h3>

      {/* Metadata */}
      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
        <div className="flex items-center gap-2">
          <FileText size={14} />
          {document.file_type?.toUpperCase()}
        </div>
        <div className="flex items-center gap-2">
          <Database size={14} />
          {formatFileSize(document.file_size)}
        </div>
        {document.date_published && (
          <div className="flex items-center gap-2">
            <Calendar size={14} />
            {formatDate(document.date_published)}
          </div>
        )}
      </div>

      {/* Tags */}
      {document.subjects && (
        <div className="flex flex-wrap gap-1 mt-3">
          {document.subjects.slice(0, 3).map(subject => (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
              {subject}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={onPreview}
          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          Preview
        </button>
        <button
          onClick={onDownload}
          className="px-3 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          <Download size={16} />
        </button>
      </div>
    </div>
  )
}
```

---

# 📱 PHASE 4: Session Management (Day 4, 3 hours)

## 4.1: Session Manager

**File:** `frontend/lib/session/SessionManager.ts` (NEW - from OKR)

*[Code provided in OKR document]*

## 4.2: Integrate with Dashboard

```typescript
// app/dashboard/page.tsx
import { sessionManager } from '@/lib/session/SessionManager'

export default function Dashboard() {
  useEffect(() => {
    // Restore session state
    const savedTab = sessionManager.getState('activeTab', 'overview')
    setActiveTab(savedTab)

    const savedCrawls = sessionManager.getState('activeCrawls', [])
    setActiveCrawls(savedCrawls)

    const savedTheme = sessionManager.getState('darkMode', false)
    setDarkMode(savedTheme)
  }, [])

  // Auto-save on changes
  useEffect(() => {
    sessionManager.saveState('activeTab', activeTab)
  }, [activeTab])

  useEffect(() => {
    sessionManager.saveState('activeCrawls', activeCrawls)
  }, [activeCrawls])

  useEffect(() => {
    sessionManager.saveState('darkMode', darkMode)
  }, [darkMode])
}
```

---

# 🔍 PHASE 5: Advanced Search & Filters (Day 5, 4 hours)

## 5.1: Advanced Search Component

**File:** `frontend/components/AdvancedSearch.tsx` (NEW - from OKR)

*[Code provided in OKR document]*

## 5.2: Saved Searches

```typescript
// lib/search/SearchManager.ts
export class SearchManager {
  saveSearch(name: string, filters: SearchFilters) {
    const searches = this.getSavedSearches()
    searches.push({
      id: Date.now().toString(),
      name,
      filters,
      created_at: new Date().toISOString()
    })
    localStorage.setItem('saved_searches', JSON.stringify(searches))
  }

  getSavedSearches(): SavedSearch[] {
    const stored = localStorage.getItem('saved_searches')
    return stored ? JSON.parse(stored) : []
  }

  loadSearch(id: string): SearchFilters | null {
    const searches = this.getSavedSearches()
    const search = searches.find(s => s.id === id)
    return search?.filters || null
  }
}
```

---

# 🎨 PHASE 6: UX Polish (Day 6-7, 6 hours)

## 6.1: Toast Notifications

**Install:** `npm install react-hot-toast`

**File:** `lib/toast/index.ts`

```typescript
import toast, { Toaster } from 'react-hot-toast'

export const showToast = {
  success: (message: string) => toast.success(message, {
    duration: 4000,
    position: 'top-right',
  }),

  error: (message: string) => toast.error(message, {
    duration: 6000,
    position: 'top-right',
  }),

  info: (message: string) => toast(message, {
    icon: 'ℹ️',
    duration: 4000,
    position: 'top-right',
  }),

  loading: (message: string) => toast.loading(message),
}

// Add to layout:
// <Toaster />
```

**Usage in components:**

```typescript
import { showToast } from '@/lib/toast'

// On crawl submit
const data = await crawlsApi.create(request)
showToast.success('Crawl submitted successfully!')

// On error
catch (err) {
  showToast.error('Failed to submit crawl. Please try again.')
}

// On completion (via WebSocket)
client.on('CRAWL_COMPLETE', () => {
  showToast.success('Crawl completed! Found 47 documents.')
})
```

## 6.2: Keyboard Shortcuts

**File:** `hooks/useKeyboardShortcuts.ts` (NEW - from OKR)

*[Code provided in OKR document]*

Add to dashboard:
```typescript
// app/dashboard/page.tsx
export default function Dashboard() {
  useKeyboardShortcuts()
  // ... rest of component
}
```

## 6.3: Empty States

Replace all empty states with proper components:

```typescript
// Before
{crawls.length === 0 && <p>No crawls yet</p>}

// After
{crawls.length === 0 && (
  <EmptyState
    icon={FileSearch}
    title="No crawls yet"
    description="Submit your first crawl request to get started"
    action={{
      label: "Submit First Crawl",
      onClick: () => focusInput()
    }}
  />
)}
```

---

# ✅ TESTING & VALIDATION (Day 7, 2 hours)

## Test Checklist

### Backend Tests
- [ ] Job persistence (save, load, list, delete)
- [ ] WebSocket connections (connect, disconnect, reconnect)
- [ ] Event broadcasting (state changes, progress)
- [ ] All API endpoints return correct data

### Frontend Tests
- [ ] Session restoration after browser close
- [ ] WebSocket auto-reconnect on disconnect
- [ ] Job detail pages load correctly
- [ ] Document browser displays all docs
- [ ] Search & filters work
- [ ] Bulk operations succeed
- [ ] Toast notifications appear
- [ ] Keyboard shortcuts work
- [ ] Dark mode consistent
- [ ] Mobile responsive

### Integration Tests
- [ ] Submit crawl → see in history
- [ ] Click job → view full details
- [ ] Download documents → get ZIP file
- [ ] Re-run job → new job created
- [ ] WebSocket updates → UI refreshes automatically
- [ ] Pause/resume → state persists
- [ ] Browser refresh → session restored

---

# 🚀 EXECUTION STRATEGY

## Development Workflow

1. **Read OKR and debugging reports** (30 min)
2. **Create implementation plan** (30 min)
3. **Get approval** (wait for user)
4. **Phase 1: Backend persistence** (4 hours)
   - Create job_store.py
   - Integrate with manager
   - Test save/load
5. **Phase 2: WebSocket** (4 hours)
   - Create ws manager
   - Create client
   - Integrate event bus
   - Test real-time updates
6. **Phase 3: Job drill-down** (4 hours)
   - Create job detail page
   - Create document browser
   - Create all sub-components
7. **Phase 4: Session management** (3 hours)
   - Create SessionManager
   - Integrate with dashboard
   - Test persistence
8. **Phase 5: Advanced search** (4 hours)
   - Create AdvancedSearch component
   - Implement saved searches
   - Add bulk operations
9. **Phase 6: UX polish** (6 hours)
   - Add toast notifications
   - Implement keyboard shortcuts
   - Polish empty states
   - Test mobile UX
10. **Phase 7: Testing** (2 hours)
    - Run all tests
    - Fix bugs
    - Verify all success criteria

**Total: ~27 hours (3-4 days full-time)**

---

# 📝 FILES TO CREATE (30+ files)

## Backend (12 files)
- [ ] backend/persistence/job_store.py
- [ ] backend/persistence/__init__.py
- [ ] backend/websocket/manager.py
- [ ] backend/websocket/__init__.py
- [ ] backend/api/routers/documents.py (already created)
- [ ] backend/api/routers/errors.py (already created)
- [ ] backend/api/routers/sessions.py
- [ ] backend/api/routers/activity.py
- [ ] backend/tests/test_persistence.py
- [ ] backend/tests/test_websocket.py
- [ ] Update: backend/crawlers/manager.py
- [ ] Update: backend/events/event_bus.py

## Frontend (18 files)
- [ ] frontend/lib/websocket/client.ts
- [ ] frontend/lib/session/SessionManager.ts
- [ ] frontend/lib/toast/index.ts
- [ ] frontend/hooks/useKeyboardShortcuts.ts
- [ ] frontend/hooks/useWebSocket.ts
- [ ] frontend/app/dashboard/jobs/[id]/page.tsx
- [ ] frontend/components/DocumentBrowser.tsx
- [ ] frontend/components/DocumentCard.tsx
- [ ] frontend/components/DocumentPreview.tsx
- [ ] frontend/components/StateTimeline.tsx
- [ ] frontend/components/ProgressBreakdown.tsx
- [ ] frontend/components/JobHeader.tsx
- [ ] frontend/components/JobOverview.tsx
- [ ] frontend/components/ConnectionStatus.tsx
- [ ] frontend/components/AdvancedSearch.tsx
- [ ] frontend/components/BulkActions.tsx
- [ ] frontend/components/EmptyState.tsx
- [ ] frontend/components/ui/Tabs.tsx

---

# 🎯 SUCCESS VALIDATION

After implementation, verify:

```bash
# 1. Backend persistence
curl http://localhost:8000/api/v1/crawls
# Should return all jobs (persisted across restarts)

# 2. WebSocket working
wscat -c ws://localhost:8000/api/v1/ws/global
# Should receive real-time events

# 3. Job detail page
open http://localhost:3000/dashboard/jobs/553a5ab2-62a0-44fa-b09a-556d2734a565
# Should show complete job details with 6 tabs

# 4. Session persistence
# Close browser → reopen → same state restored

# 5. Mobile UX
# Resize browser → all components responsive
```

---

# 🚨 IMPORTANT NOTES

1. **Maintain existing functionality** - Don't break what works
2. **Test incrementally** - Verify each phase before next
3. **Use TypeScript strictly** - No any types
4. **Follow existing patterns** - Match code style
5. **Dark mode everywhere** - All new components must support it
6. **Mobile-first** - Design for mobile, enhance for desktop
7. **Accessibility** - ARIA labels, keyboard navigation
8. **Performance** - Lazy load, virtualize long lists

---

# 📊 HEALTH SCORE TARGETS

| Category | Current | Target | Priority |
|----------|---------|--------|----------|
| Error Handling | 90/100 | 98/100 | P0 |
| UX Polish | 80/100 | 95/100 | P1 |
| Real-Time Updates | 60/100 | 95/100 | P0 |
| Job Management | 75/100 | 95/100 | P0 |
| Session Management | 0/100 | 90/100 | P1 |
| Mobile UX | 85/100 | 95/100 | P2 |
| Accessibility | 70/100 | 90/100 | P2 |
| Performance | 85/100 | 92/100 | P2 |

---

**EXECUTE THIS PLAN AUTONOMOUSLY**

1. Create your implementation plan
2. Wait for approval
3. Work through each phase systematically
4. Test after each phase
5. Report progress
6. Deliver production-ready dashboard

**BEGIN NOW.**
