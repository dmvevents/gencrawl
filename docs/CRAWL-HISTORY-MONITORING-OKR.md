# Crawl History & Job Monitoring System - OKR

**Project:** GenCrawl Crawl History & Job Viewer
**Owner:** Full-Stack Team
**Timeline:** Days 1-3
**Status:** Planning → Execution
**Date:** January 20, 2026

---

## Executive Summary

Build a comprehensive **Crawl History & Job Monitoring System** that allows users to:
- View all past, active, and completed crawl jobs
- Monitor job details with complete state history
- Analyze crawl results and metrics
- Re-run previous crawls
- Compare multiple crawls
- Export and download results

---

## Objective 1: Implement Crawl History Dashboard

**Owner:** Frontend Team
**Timeline:** Days 1-2

### Key Results

| KR | Metric | Target | Measurement |
|----|--------|--------|-------------|
| **KR 1.1** | History page implemented | 100% | Complete UI with job list |
| **KR 1.2** | Job filtering options | 5+ | Status, date, user, source, query |
| **KR 1.3** | Job detail view | 100% | State history, metrics, logs, results |
| **KR 1.4** | Search functionality | 100% | Search by query text, URL, ID |
| **KR 1.5** | Pagination performance | <100ms | 100 jobs per page |

### Features

**Job List View:**
- All crawl jobs in table/card format
- Columns: ID, Query, Status, Started, Duration, Documents, Quality
- Status badges (completed, running, failed, paused, cancelled)
- Quick actions (View, Delete, Re-run)
- Sort by: date, status, duration, document count

**Filters:**
- Status: All, Active, Completed, Failed, Paused, Cancelled
- Date Range: Today, Week, Month, All Time, Custom
- Source: Filter by target domains
- User: Filter by user_id
- Query Search: Full-text search

**Job Detail View:**
- Full query text with LLM-generated config
- State timeline with durations
- Complete metrics breakdown
- Event log (filterable)
- Document list with previews
- Re-run button
- Export results button

---

## Objective 2: Build Job Comparison & Analytics

**Owner:** Frontend + Backend Team
**Timeline:** Days 2-3

### Key Results

| KR | Metric | Target | Measurement |
|----|--------|--------|-------------|
| **KR 2.1** | Comparison view | 100% | Side-by-side job comparison |
| **KR 2.2** | Comparison metrics | 10+ | Progress, speed, quality, efficiency |
| **KR 2.3** | Historical analytics | 100% | Trends over time |
| **KR 2.4** | Performance insights | 5+ | Bottlenecks, optimization suggestions |
| **KR 2.5** | Export formats | 3+ | JSON, CSV, PDF report |

### Features

**Job Comparison:**
- Select 2-5 jobs to compare
- Side-by-side metrics
- Difference calculations
- Efficiency scores
- Recommendations for improvement

**Historical Analytics:**
- Success rate over time
- Average quality trends
- Throughput trends
- Most crawled sources
- Common error patterns

**Performance Insights:**
- Slowest states identified
- Optimization opportunities
- Resource usage patterns
- Best practices suggestions

---

## Objective 3: Enable Job Management & Control

**Owner:** Backend Team
**Timeline:** Day 1

### Key Results

| KR | Metric | Target | Measurement |
|----|--------|--------|-------------|
| **KR 3.1** | List all jobs endpoint | 100% | /api/v1/crawls |
| **KR 3.2** | Job persistence | 100% | Store in PostgreSQL/file system |
| **KR 3.3** | Re-run functionality | 100% | Copy config, new job ID |
| **KR 3.4** | Bulk operations | 3+ | Delete, pause, cancel multiple |
| **KR 3.5** | Job retention policy | 100% | Auto-delete after 30 days (configurable) |

### API Endpoints (NEW)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/crawls` | GET | List all crawls with pagination |
| `/api/v1/crawls/active` | GET | List only active crawls |
| `/api/v1/crawls/completed` | GET | List completed crawls |
| `/api/v1/crawls/failed` | GET | List failed crawls |
| `/api/v1/crawl/{id}/rerun` | POST | Re-run a previous crawl |
| `/api/v1/crawl/{id}/delete` | DELETE | Delete a crawl job |
| `/api/v1/crawls/bulk-delete` | POST | Delete multiple jobs |
| `/api/v1/crawl/{id}/compare` | POST | Compare with other jobs |
| `/api/v1/crawls/stats` | GET | Overall statistics |

---

## Objective 4: Implement Result Viewing & Export

**Owner:** Full-Stack Team
**Timeline:** Days 2-3

### Key Results

| KR | Metric | Target | Measurement |
|----|--------|--------|-------------|
| **KR 4.1** | Document viewer | 100% | Preview PDFs, HTML, text |
| **KR 4.2** | Metadata display | 100% | All extracted metadata shown |
| **KR 4.3** | Download options | 3+ | Single file, batch ZIP, JSONL export |
| **KR 4.4** | Quality visualization | 100% | Score distribution, flags |
| **KR 4.5** | Search within results | 100% | Search documents by content |

### Features

**Results Dashboard:**
- Document grid/list view
- Thumbnail previews
- Metadata cards
- Quality scores with color coding
- Download buttons
- Batch selection

**Document Viewer:**
- PDF preview (embedded)
- Text content display
- Metadata panel
- Quality assessment details
- Download original file
- View in Weaviate (if embedded)

**Export Options:**
- JSONL (Nemo Curator format)
- CSV (metadata only)
- ZIP (all documents + manifest)
- PDF Report (summary + statistics)

---

## Objective 5: Dashboard Integration & UX

**Owner:** UX Team
**Timeline:** Day 3

### Key Results

| KR | Metric | Target | Measurement |
|----|--------|--------|-------------|
| **KR 5.1** | New dashboard tabs | 2+ | History, Comparison |
| **KR 5.2** | Navigation flow | 100% | Seamless tab switching |
| **KR 5.3** | Mobile responsive | 100% | Works on mobile/tablet |
| **KR 5.4** | Load time | <2s | Page performance |
| **KR 5.5** | UX polish | 100% | Animations, loading states, empty states |

### Dashboard Structure (ENHANCED)

```
GenCrawl Dashboard (6 Tabs)
├── Overview       (Live metrics, recent activity)
├── Active Crawls  (Real-time monitoring)
├── History        (✨ NEW - All past jobs)
├── Comparison     (✨ NEW - Side-by-side analysis)
├── Logs           (Event viewer)
└── Analytics      (Charts and insights)
```

**Navigation Flow:**
```
Landing Page → Dashboard
                    ↓
    ┌───────────────┴───────────────┐
    ↓               ↓               ↓
Overview      Active Crawls     History
    ↓               ↓               ↓
(Quick view)  (Real-time)    (All jobs)
                    ↓               ↓
                 Job Detail ← Click job
                    ↓
            View/Download/Re-run
```

---

## Success Criteria

### Functional Requirements
- [ ] View all crawl jobs (past, active, completed)
- [ ] Filter and search jobs
- [ ] View detailed job information
- [ ] See complete state history
- [ ] Access logs and metrics
- [ ] Download results
- [ ] Re-run previous crawls
- [ ] Compare multiple jobs
- [ ] Export data in multiple formats

### Non-Functional Requirements
- [ ] Page loads in <2 seconds
- [ ] Real-time updates (<5s latency)
- [ ] Handles 1000+ jobs
- [ ] Mobile responsive
- [ ] Accessible (WCAG AA)

---

## Technical Implementation Plan

### Backend (Python/FastAPI)

**File:** `backend/api/routers/crawls.py` (NEW)

```python
@router.get("/crawls")
async def list_crawls(
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    sort_by: str = "created_at",
    order: str = "desc"
):
    """List all crawl jobs with pagination and filtering."""
    pass

@router.get("/crawl/{crawl_id}/full")
async def get_full_crawl_details(crawl_id: str):
    """Get complete crawl details including state history, metrics, logs."""
    pass

@router.post("/crawl/{crawl_id}/rerun")
async def rerun_crawl(crawl_id: str):
    """Re-run a previous crawl with same configuration."""
    pass
```

### Frontend (Next.js/React)

**File:** `frontend/app/dashboard/history/page.tsx` (NEW)

```typescript
export default function CrawlHistory() {
  // Job list with filters
  // Job detail modal
  // Re-run functionality
  // Download results
}
```

**File:** `frontend/components/CrawlHistoryTable.tsx` (NEW)

```typescript
// Table with sorting, filtering, pagination
// Status badges, metrics columns
// Quick actions menu
```

**File:** `frontend/components/JobDetailModal.tsx` (NEW)

```typescript
// Full job details in modal/drawer
// State timeline visualization
// Metrics breakdown
// Logs tab
// Results tab
// Re-run button
```

---

## Dashboard Design (Enhanced)

### History Tab Layout

```
┌─────────────────────────────────────────────────────────────┐
│ [Overview] [Active] [History] [Comparison] [Logs] [Analytics]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Crawl History                                               │
│                                                              │
│ Filters: [All Statuses ▼] [Last 30 Days ▼] [🔍 Search]     │
│ Sort by: [Created Date ▼] [⬇]                              │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ ✅ Find Trinidad SEA materials              2h 15m ago   ││
│ │    ID: 553a...565 | Status: COMPLETED | Duration: 10.7s ││
│ │    📄 50 docs | ⭐ Avg Quality: N/A | 🎯 Success: 100%  ││
│ │    [View Details] [Re-run] [Download] [Delete]          ││
│ ├──────────────────────────────────────────────────────────┤│
│ │ ✅ Find CXC CSEC Math papers               Earlier today ││
│ │    ID: e6a...56a | Status: COMPLETED | Duration: 2h 23m ││
│ │    📄 234 docs | ⭐ Quality: 0.89 | 🎯 Success: 94.2%   ││
│ │    [View Details] [Re-run] [Download] [Delete]          ││
│ ├──────────────────────────────────────────────────────────┤│
│ │ ❌ Download CAPE Chemistry                 Yesterday     ││
│ │    ID: abc...123 | Status: FAILED | Error: Rate limit   ││
│ │    📄 15 docs | ⭐ Quality: N/A | 🎯 Success: 42%       ││
│ │    [View Details] [Retry] [Delete]                       ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ Showing 3 of 127 crawls | [◀ Previous] [Next ▶]            │
└─────────────────────────────────────────────────────────────┘
```

### Job Detail View (Modal/Page)

```
┌─────────────────────────────────────────────────────────────┐
│ Job Details: Find Trinidad SEA materials          [✕ Close] │
├─────────────────────────────────────────────────────────────┤
│ [Overview] [State History] [Metrics] [Logs] [Results]      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Overview                                                     │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ Query: "Find Trinidad SEA materials..."                  ││
│ │ Status: ✅ COMPLETED                                     ││
│ │ Duration: 10.7 seconds                                   ││
│ │ Started: 2026-01-20 16:10:28                            ││
│ │ Completed: 2026-01-20 16:10:39                          ││
│ │                                                          ││
│ │ Results:                                                 ││
│ │ • 100 URLs crawled (100% success)                       ││
│ │ • 50 documents found                                    ││
│ │ • 50 documents processed                                ││
│ │                                                          ││
│ │ Configuration:                                           ││
│ │ • Crawler: Playwright                                   ││
│ │ • Sources: moe.gov.tt, ttcsec.org, sea.gov.tt + 2 more ││
│ │ • Keywords: 15 filters                                  ││
│ │ • File Types: PDF, DOC, DOCX, XLSX, PPTX              ││
│ │                                                          ││
│ │ [Re-run This Crawl] [Download Results] [Delete]        ││
│ └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

Let me create the OKR and then execute the implementation autonomously:
