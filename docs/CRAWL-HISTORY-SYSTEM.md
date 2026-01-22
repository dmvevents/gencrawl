# Crawl History & Job Monitoring System

## Overview

A comprehensive crawl history viewing, job details, re-run, and comparison system for GenCrawl.

## Backend Endpoints

### Crawls Router (`/api/v1/crawls`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/crawls` | GET | List all crawls with pagination |
| `/api/v1/crawls/stats` | GET | Get overall statistics |
| `/api/v1/crawls/recent` | GET | Get recent crawls |
| `/api/v1/crawl/{id}/full` | GET | Get complete job details |
| `/api/v1/crawl/{id}/rerun` | POST | Re-run with same config |
| `/api/v1/crawl/{id}` | DELETE | Delete crawl job |
| `/api/v1/crawl/{id}/download` | GET | Download results |

### Query Parameters

#### List Crawls (`/api/v1/crawls`)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50, max: 100)
- `status` - Filter by status: completed, running, failed, cancelled
- `user_id` - Filter by user ID
- `search` - Search in query text and targets
- `sort_by` - Sort field: started_at, duration, documents, success_rate
- `sort_order` - asc or desc

### Response Format

```json
{
  "crawls": [
    {
      "crawl_id": "553a5ab2-62a0-44fa-b09a-556d2734a565",
      "query": "Find Trinidad SEA practice tests...",
      "status": "completed",
      "started_at": "2026-01-20T16:10:28.428316",
      "completed_at": "2026-01-20T16:10:39.165121",
      "duration_seconds": 10.74,
      "urls_crawled": 100,
      "urls_total": 100,
      "documents_found": 50,
      "success_rate": 100.0,
      "quality_score": 0.0,
      "targets": ["https://www.moe.gov.tt", ...],
      "user_id": "default"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50,
  "total_pages": 1
}
```

## Frontend Components

### 1. CrawlHistoryTable

**File:** `frontend/components/CrawlHistoryTable.tsx`

Features:
- Displays all crawls in sortable table
- Status badges with colors (green=completed, blue=running, red=failed)
- Search bar for query text
- Filter dropdown by status
- Pagination controls
- Click row to view details
- Auto-refresh for active jobs (every 5 seconds)
- Loading skeletons
- Empty state with clear filters button

### 2. JobDetailModal

**File:** `frontend/components/JobDetailModal.tsx`

Features:
- Full-screen modal with tabs:
  - **Overview**: Query, stats grid, timing, targets
  - **State History**: Timeline of state transitions
  - **Metrics**: Performance metrics grid
  - **Event Log**: Scrollable log viewer (last 100 events)
  - **Configuration**: Pretty-printed JSON config
- Action buttons: Re-run, Download, Delete
- Copy crawl ID to clipboard
- Auto-refresh for active jobs
- Keyboard navigation (Escape to close)

### 3. JobStatsCard

**File:** `frontend/components/JobStatsCard.tsx`

Features:
- Overview statistics grid
- Total, Completed, Running, Failed counts
- Total documents found
- Average success rate
- Clickable cards to filter history table
- Auto-refresh every 10 seconds

## Dashboard Integration

The History tab is added to the main dashboard (`app/dashboard/page.tsx`):

1. Added "History" tab with icon
2. Shows JobStatsCard overview
3. Shows CrawlHistoryTable below
4. JobDetailModal opens when clicking a crawl
5. Re-run creates new crawl and switches to Active tab
6. Delete removes from history and refreshes

## Status Colors

| Status | Background | Text |
|--------|------------|------|
| Completed | Green (#10B981) | White |
| Running | Blue (#3B82F6) | White |
| Failed | Red (#EF4444) | White |
| Paused | Yellow (#F59E0B) | White |
| Cancelled | Gray (#6B7280) | White |
| Queued | Purple (#8B5CF6) | White |

## Data Persistence

Jobs are persisted via:
1. Event log files: `logs/crawl_{id}_events.jsonl`
2. Text log files: `logs/crawl_{id}.log`
3. (Optional) JSON files: `data/jobs/{id}.json`

The backend parses log files to reconstruct job state including:
- Query from crawl_start event
- Status from state transitions or crawl_complete
- Metrics from page_crawled events
- Duration from timestamps

## Testing

```bash
# List all crawls
curl http://localhost:8000/api/v1/crawls

# Get stats
curl http://localhost:8000/api/v1/crawls/stats

# Get full details
curl http://localhost:8000/api/v1/crawl/{id}/full

# Filter by status
curl "http://localhost:8000/api/v1/crawls?status=completed"

# Search
curl "http://localhost:8000/api/v1/crawls?search=Trinidad"

# Re-run a crawl
curl -X POST http://localhost:8000/api/v1/crawl/{id}/rerun

# Delete a crawl
curl -X DELETE http://localhost:8000/api/v1/crawl/{id}
```

## Files Created/Modified

### Backend
- `backend/api/routers/crawls.py` - New crawls router
- `backend/api/main.py` - Added crawls router import
- `backend/api/routers/__init__.py` - Added crawls export
- `backend/utils/persistence.py` - Job persistence utilities

### Frontend
- `frontend/components/CrawlHistoryTable.tsx` - History table component
- `frontend/components/JobDetailModal.tsx` - Detail modal component
- `frontend/components/JobStatsCard.tsx` - Stats card component
- `frontend/app/dashboard/page.tsx` - Updated with History tab

## Current Demo Data

**Job ID:** `553a5ab2-62a0-44fa-b09a-556d2734a565`

- Query: "Find Trinidad SEA practice tests and curriculum guidelines"
- Status: COMPLETED
- Duration: 10.7 seconds
- URLs: 100 crawled (100% success)
- Documents: 50 found
- Sources: moe.gov.tt, sea.gov.tt, examcornertt.com, ttconnect.gov.tt, caribexams.org
